import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';
import { Resend } from 'npm:resend@4.0.0';

async function resolveMailSettings(base44, companyId) {
  const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
  const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';
  if (!companyId) return { error: 'No company_id', blocked: true };
  const settings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: companyId });
  const cfg = settings[0];
  if (!cfg || !cfg.mail_enabled) {
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, method: 'resend', enabled: true, fallbackUsed: true };
  }
  if (cfg.mail_domain_verified) {
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, method: 'resend', enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_fallback_allowed !== false) {
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, method: 'resend', enabled: true, fallbackUsed: true };
  }
  return { error: `Domain not verified and fallback not allowed`, blocked: true };
}

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id, deposit_amount, deposit_option } = await req.json();

    if (!job_id || !deposit_amount || deposit_amount <= 0) {
      return Response.json({ error: 'job_id and a positive deposit_amount are required' }, { status: 400 });
    }

    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    const job = jobs[0];
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    const customers = await base44.asServiceRole.entities.Customer.filter({ id: job.customer_id });
    const customer = customers[0];

    const companies = await base44.asServiceRole.entities.Company.filter({ id: job.company_id });
    const company = companies[0];

    // Check for connected Stripe account
    let stripeOptions = {};
    if (company?.stripe_account_id && company?.stripe_onboarding_complete) {
      stripeOptions = { stripeAccount: company.stripe_account_id };
    }

    const depositLabel = `Deposit – ${job.title}`;

    // Create a Stripe Payment Link (reusable, shareable)
    const priceData = await stripe.prices.create({
      currency: 'usd',
      unit_amount: Math.round(deposit_amount * 100),
      product_data: { name: depositLabel },
    }, Object.keys(stripeOptions).length > 0 ? stripeOptions : undefined);

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceData.id, quantity: 1 }],
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        job_id,
        deposit: 'true',
      },
    }, Object.keys(stripeOptions).length > 0 ? stripeOptions : undefined);

    console.log(`Deposit payment link created: ${paymentLink.url} for job ${job_id}, amount $${deposit_amount}`);

    // Save deposit info on the job record
    await base44.asServiceRole.entities.Job.update(job_id, {
      deposit_amount,
      deposit_status: 'pending',
      deposit_stripe_link: paymentLink.url,
    });

    // Send customer email if they have an email
    if (customer?.email) {
      const mailSettings = await resolveMailSettings(base44, job.company_id);
      if (!mailSettings.blocked) {
        const companyName = company?.name || 'FieldFlow Pro';
        const primaryColor = company?.primary_color || '#2563eb';
        const customerName = customer.first_name || customer.business_name || 'there';
        const formattedAmount = `$${deposit_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        await resend.emails.send({
          from: mailSettings.from,
          reply_to: mailSettings.replyTo,
          to: customer.email,
          subject: `Deposit Request: ${formattedAmount} for ${job.title}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#1e293b;margin:0 0 8px;">${companyName}</h2>
            <p style="color:#475569;">Hi ${customerName},</p>
            <p style="color:#475569;">A deposit of <strong>${formattedAmount}</strong> is requested to confirm your upcoming service: <strong>${job.title}</strong>.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
              <div style="font-size:32px;font-weight:700;color:#1e293b;">${formattedAmount}</div>
              <div style="color:#64748b;margin-top:4px;">Deposit</div>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${paymentLink.url}" style="display:inline-block;background:${primaryColor};color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Pay Deposit Now →</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Questions? Contact ${company?.email || company?.phone || companyName}.</p>
          </div>`,
        });
        console.log(`Deposit email sent to ${customer.email}`);
      }
    }

    return Response.json({
      success: true,
      payment_link: paymentLink.url,
      deposit_amount,
    });
  } catch (error) {
    console.error('requestDeposit error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});