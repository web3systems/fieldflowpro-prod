import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoice_id, deposit_amount, success_url, cancel_url } = await req.json();

    if (!invoice_id || !deposit_amount || deposit_amount <= 0) {
      return Response.json({ error: 'invoice_id and a positive deposit_amount are required' }, { status: 400 });
    }

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    const invoice = invoices[0];
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    // Look up company Stripe connected account
    let stripeOptions = {};
    if (invoice.company_id) {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: invoice.company_id });
      const company = companies[0];
      if (company?.stripe_account_id && company?.stripe_onboarding_complete) {
        stripeOptions = { stripeAccount: company.stripe_account_id };
      }
    }

    const label = `Deposit – ${invoice.invoice_number || 'Invoice'}`;

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: label },
          unit_amount: Math.round(deposit_amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${success_url}?deposit_success=true&invoice_id=${invoice_id}&deposit_amount=${deposit_amount}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || success_url,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        invoice_id,
        deposit_amount: String(deposit_amount),
        deposit: 'true',
      },
    };

    const session = Object.keys(stripeOptions).length > 0
      ? await stripe.checkout.sessions.create(sessionParams, stripeOptions)
      : await stripe.checkout.sessions.create(sessionParams);

    console.log(`Invoice deposit checkout created: ${session.id}, $${deposit_amount} on invoice ${invoice_id}`);
    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Invoice deposit checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});