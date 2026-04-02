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
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subject, message, company_ids } = await req.json();
    if (!subject || !message || !company_ids?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const allCustomers = await base44.asServiceRole.entities.Customer.list();
    const targets = allCustomers.filter(c => company_ids.includes(c.company_id) && c.email);
    const skipped = allCustomers.filter(c => company_ids.includes(c.company_id) && !c.email).length;

    // Cache mail settings per company to avoid redundant DB lookups
    const mailSettingsCache = {};
    async function getMailSettingsCached(companyId) {
      if (!mailSettingsCache[companyId]) {
        mailSettingsCache[companyId] = await resolveMailSettings(base44, companyId);
      }
      return mailSettingsCache[companyId];
    }

    let sent = 0;
    for (const customer of targets) {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Valued Customer';
      const mailSettings = await getMailSettingsCached(customer.company_id);
      if (mailSettings.blocked) {
        console.warn(`[sendAnnouncement] Skipping company ${customer.company_id}: ${mailSettings.error}`);
        continue;
      }
      try {
        await resend.emails.send({
          from: mailSettings.from,
          reply_to: mailSettings.replyTo,
          to: customer.email,
          subject,
          html: `<p>Hi ${name},</p><br/>${message.replace(/\n/g, '<br/>')}`,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${customer.email}:`, err.message);
      }
    }

    return Response.json({ sent, skipped });
  } catch (error) {
    console.error('sendAnnouncement error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});