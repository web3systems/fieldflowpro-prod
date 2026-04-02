import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
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

    const { customer_id, portal_url } = await req.json();

    const customers = await base44.asServiceRole.entities.Customer.filter({ id: customer_id });
    const customer = customers[0];
    if (!customer?.email) return Response.json({ error: 'Customer has no email' }, { status: 400 });

    if (user.role !== 'admin') {
      const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({ user_email: user.email, company_id: customer.company_id });
      if (access.length === 0) return Response.json({ error: 'Forbidden: No access to this company' }, { status: 403 });
    }

    const companies = await base44.asServiceRole.entities.Company.filter({ id: customer.company_id });
    const company = companies[0];

    const mailSettings = await resolveMailSettings(base44, customer.company_id);
    if (mailSettings.blocked) {
      console.error(`[sendPortalInvite] Blocked: ${mailSettings.error}`);
      return Response.json({ error: mailSettings.error }, { status: 400 });
    }

    await resend.emails.send({
      from: mailSettings.from,
      reply_to: mailSettings.replyTo,
      to: customer.email,
      subject: `Your customer portal is ready — ${company?.name}`,
      html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b; margin: 0 0 16px;">Your Customer Portal is Ready</h2>
        <p style="color: #475569;">Hi ${customer.first_name},</p>
        <p style="color: #475569;"><strong>${company?.name}</strong> has set up a customer portal for you. You can view your jobs, invoices, and estimates anytime.</p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${portal_url}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View Your Portal →</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Sign in with this email: <strong>${customer.email}</strong></p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Questions? Contact ${company?.email || company?.phone || "us"}.</p>
      </div>`
    });

    console.log(`[sendPortalInvite] Sent to ${customer.email} from ${mailSettings.from} (fallback: ${mailSettings.fallbackUsed})`);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error sending portal invite:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});