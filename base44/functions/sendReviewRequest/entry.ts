import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

async function resolveMailSettings(base44, companyId) {
  const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
  const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';
  if (!companyId) return { error: 'No company_id', blocked: true };
  const settings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: companyId });
  const cfg = settings[0];
  if (!cfg || !cfg.mail_enabled) return { error: `Email not configured for company ${companyId}`, blocked: true };
  if (cfg.mail_domain_verified) {
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_fallback_allowed) {
    console.warn(`[MailResolver] Company ${companyId} using platform fallback`);
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, enabled: true, fallbackUsed: true };
  }
  return { error: `Domain not verified and fallback not allowed for company ${companyId}`, blocked: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id, customer_id, company_id, method = 'email' } = await req.json();

    // Resolve customer — either directly or via job
    let customer = null;
    let job = null;
    let resolvedCompanyId = company_id;

    if (job_id) {
      const jobs = await base44.entities.Job.filter({ id: job_id });
      if (!jobs[0]) return Response.json({ error: 'Job not found' }, { status: 404 });
      job = jobs[0];
      resolvedCompanyId = resolvedCompanyId || job.company_id;
      const customers = await base44.entities.Customer.filter({ id: job.customer_id });
      customer = customers[0];
    } else if (customer_id) {
      const customers = await base44.entities.Customer.filter({ id: customer_id });
      customer = customers[0];
    }

    if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

    // Check access
    if (user.role !== 'admin') {
      const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({ user_email: user.email, company_id: resolvedCompanyId });
      if (access.length === 0) return Response.json({ error: 'Forbidden: No access to this company' }, { status: 403 });
    }

    const companies = await base44.entities.Company.filter({ id: resolvedCompanyId });
    const company = companies[0];
    const companyName = company?.name || 'us';
    const jobTitle = job?.title || 'your recent service';
    const reviewUrl = company?.google_review_url;
    const firstName = customer.first_name || customer.business_name || 'there';

    const results = { email: null, sms: null };

    // Send email
    if (method === 'email' || method === 'both') {
      if (!customer.email) {
        console.warn('[sendReviewRequest] No email for customer, skipping email');
      } else {
        const mailSettings = await resolveMailSettings(base44, resolvedCompanyId);
        if (mailSettings.blocked) {
          console.error(`[sendReviewRequest] Email blocked: ${mailSettings.error}`);
          results.email = { error: mailSettings.error };
        } else {
          const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <p style="color:#475569;">Hi ${firstName},</p>
            <p style="color:#475569;">Thank you for choosing <strong>${companyName}</strong>${job ? ` for your recent service: <em>${jobTitle}</em>` : ''}.</p>
            <p style="color:#475569;">We hope everything went smoothly! Your feedback means the world to us.</p>
            ${reviewUrl
              ? `<div style="margin:28px 0;text-align:center;"><a href="${reviewUrl}" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Leave a Review ⭐</a></div>`
              : `<p style="color:#475569;">Please don't hesitate to reach out with any feedback!</p>`
            }
            <p style="color:#475569;">Thank you for being a valued customer!</p>
            <p style="color:#374151;font-weight:600;">${companyName}</p>
            ${company?.phone ? `<p style="color:#64748b;font-size:14px;">📞 ${company.phone}</p>` : ''}
          </div>`;

          await resend.emails.send({
            from: mailSettings.from,
            reply_to: mailSettings.replyTo,
            to: customer.email,
            subject: `How was your experience with ${companyName}?`,
            html,
          });
          results.email = { sent: true };
          console.log(`[sendReviewRequest] Email sent to ${customer.email}`);
        }
      }
    }

    // Send SMS via Twilio (reuse sendCustomerSms pattern)
    if (method === 'sms' || method === 'both') {
      if (!customer.phone) {
        console.warn('[sendReviewRequest] No phone for customer, skipping SMS');
        results.sms = { error: 'No phone on file' };
      } else {
        const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
        const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
        const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
          console.error('[sendReviewRequest] Twilio not configured');
          results.sms = { error: 'SMS not configured' };
        } else {
          const smsBody = `Hi ${firstName}! Thanks for choosing ${companyName}${job ? ` for "${jobTitle}"` : ''}. We'd love your feedback!${reviewUrl ? ' ' + reviewUrl : ' Please let us know how we did.'}`;
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
          // Normalize phone to E.164
          let toPhone = String(customer.phone).replace(/\D/g, '');
          if (toPhone.length === 10) toPhone = '+1' + toPhone;
          else if (!String(customer.phone).trim().startsWith('+')) toPhone = '+' + toPhone;
          const resp = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: toPhone, From: TWILIO_FROM_NUMBER, Body: smsBody }).toString(),
          });
          const smsResult = await resp.json();
          if (smsResult.error_code) {
            console.error('[sendReviewRequest] SMS error:', smsResult.error_message);
            results.sms = { error: smsResult.error_message };
          } else {
            results.sms = { sent: true };
            console.log(`[sendReviewRequest] SMS sent to ${customer.phone}`);
          }
        }
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('sendReviewRequest error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});