import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoice_id, amount, payment_method_id, send_receipt } = await req.json();

    if (!invoice_id || !amount || !payment_method_id) {
      return Response.json({ error: 'invoice_id, amount, and payment_method_id are required' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    const invoice = invoices[0];
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (amountCents <= 0) return Response.json({ error: 'Amount must be greater than 0' }, { status: 400 });

    // Look up connected Stripe account for the company
    let stripeOptions = {};
    if (invoice.company_id) {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: invoice.company_id });
      const company = companies[0];
      if (company?.stripe_account_id && company?.stripe_onboarding_complete) {
        stripeOptions = { stripeAccount: company.stripe_account_id };
        console.log(`Routing manual charge to connected account: ${company.stripe_account_id}`);
      }
    }

    // Create and confirm a PaymentIntent immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method: payment_method_id,
      confirm: true,
      return_url: 'https://example.com', // required for some flows, won't be used for card
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        invoice_id,
      },
    }, Object.keys(stripeOptions).length > 0 ? stripeOptions : undefined);

    if (paymentIntent.status !== 'succeeded') {
      console.error(`PaymentIntent status: ${paymentIntent.status}`);
      return Response.json({ error: `Payment not completed. Status: ${paymentIntent.status}` }, { status: 400 });
    }

    // Update invoice
    const now = new Date();
    const etDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit"
    }).format(now);
    const [month, day, year] = etDate.split("/");
    const paid_date = `${year}-${month}-${day}`;

    const chargedAmount = amountCents / 100;
    const newAmountPaid = (invoice.amount_paid || 0) + chargedAmount;
    const newStatus = newAmountPaid >= invoice.total ? "paid" : "partial";

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      amount_paid: newAmountPaid,
      status: newStatus,
      payment_method: "stripe_manual",
      ...(newStatus === "paid" ? { paid_date } : {}),
    });

    console.log(`Manual charge of $${chargedAmount} succeeded for invoice ${invoice_id}. Status: ${newStatus}`);

    // Optionally send receipt email
    if (send_receipt) {
      try {
        await base44.functions.invoke('sendInvoiceEmail', {
          invoice_id,
          portal_url: null,
        });
        console.log(`Receipt email sent for invoice ${invoice_id}`);
      } catch (e) {
        console.warn(`Receipt email failed: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      charged: chargedAmount,
      new_status: newStatus,
      new_amount_paid: newAmountPaid,
    });
  } catch (error) {
    console.error('Manual charge error:', error.message);
    // Provide helpful Stripe error messages
    if (error.type === 'StripeCardError') {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});