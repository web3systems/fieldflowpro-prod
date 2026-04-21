import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id, deposit_amount, deposit_label, success_url, cancel_url } = await req.json();

    if (!job_id || !deposit_amount || deposit_amount <= 0) {
      return Response.json({ error: 'job_id and a positive deposit_amount are required' }, { status: 400 });
    }

    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    const job = jobs[0];
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Look up company Stripe account
    let stripeOptions = {};
    if (job.company_id) {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: job.company_id });
      const company = companies[0];
      if (company?.stripe_account_id && company?.stripe_onboarding_complete) {
        stripeOptions = { stripeAccount: company.stripe_account_id };
        console.log(`Routing deposit to connected account: ${company.stripe_account_id}`);
      }
    }

    // Create a deposit invoice to track the payment
    const allInv = await base44.asServiceRole.entities.Invoice.list();
    const invoice_number = `DEP-${String((allInv.length || 0) + 1).padStart(4, "0")}`;
    const invoice = await base44.asServiceRole.entities.Invoice.create({
      company_id: job.company_id,
      customer_id: job.customer_id,
      job_id: job_id,
      estimate_id: job.estimate_id || "",
      invoice_number,
      status: "sent",
      line_items: [{ description: deposit_label || `Deposit – ${job.title}`, quantity: 1, unit_price: deposit_amount, total: deposit_amount }],
      subtotal: deposit_amount,
      tax_rate: 0,
      tax_amount: 0,
      total: deposit_amount,
      amount_paid: 0,
      notes: "Deposit invoice",
    });

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: deposit_label || `Deposit – ${job.title}` },
          unit_amount: Math.round(deposit_amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${success_url}?payment_success=true&invoice_id=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || success_url,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        invoice_id: invoice.id,
        job_id: job_id,
        deposit: 'true',
      },
    };

    const session = Object.keys(stripeOptions).length > 0
      ? await stripe.checkout.sessions.create(sessionParams, stripeOptions)
      : await stripe.checkout.sessions.create(sessionParams);

    console.log(`Deposit checkout session created: ${session.id} for job ${job_id}, amount $${deposit_amount}`);
    return Response.json({ url: session.url, session_id: session.id, invoice_id: invoice.id });
  } catch (error) {
    console.error('Deposit checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});