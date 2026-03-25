import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id, success_url, cancel_url } = await req.json();

    if (!invoice_id) {
      return Response.json({ error: 'invoice_id is required' }, { status: 400 });
    }

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    const invoice = invoices[0];
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const amountDue = (invoice.total || 0) - (invoice.amount_paid || 0);
    if (amountDue <= 0) {
      return Response.json({ error: 'Invoice is already fully paid' }, { status: 400 });
    }

    // Look up the company's connected Stripe account
    let stripeOptions = {};
    if (invoice.company_id) {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: invoice.company_id });
      const company = companies[0];
      if (company?.stripe_account_id && company?.stripe_onboarding_complete) {
        stripeOptions = { stripeAccount: company.stripe_account_id };
        console.log(`Routing payment to connected account: ${company.stripe_account_id}`);
      } else {
        console.log(`Company ${invoice.company_id} has no connected Stripe account — using platform account`);
      }
    }

    const lineItems = [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Invoice ${invoice.invoice_number || invoice_id}` },
        unit_amount: Math.round(amountDue * 100),
      },
      quantity: 1,
    }];

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${success_url}?payment_success=true&invoice_id=${invoice_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || success_url,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        invoice_id: invoice_id,
      },
    };

    const session = Object.keys(stripeOptions).length > 0
      ? await stripe.checkout.sessions.create(sessionParams, stripeOptions)
      : await stripe.checkout.sessions.create(sessionParams);

    console.log(`Stripe checkout session created: ${session.id} for invoice ${invoice_id}`);
    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});