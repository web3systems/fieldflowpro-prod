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
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { campaign_id } = await req.json();
    if (!campaign_id) return Response.json({ error: 'campaign_id required' }, { status: 400 });

    const campaigns = await base44.asServiceRole.entities.MarketingCampaign.filter({ id: campaign_id });
    const campaign = campaigns[0];
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });

    const mailSettings = await resolveMailSettings(base44, campaign.company_id);
    if (mailSettings.blocked) {
      console.error(`[sendMarketingCampaign] Blocked: ${mailSettings.error}`);
      return Response.json({ error: mailSettings.error }, { status: 400 });
    }

    let recipients = [];
    if (campaign.audience === 'leads') {
      const leads = await base44.asServiceRole.entities.Lead.filter({ company_id: campaign.company_id });
      recipients = leads.filter(l => campaign.type === 'email' ? l.email : l.phone)
        .map(l => ({ name: `${l.first_name} ${l.last_name}`, email: l.email, phone: l.phone }));
    } else {
      const statusFilter = campaign.audience === 'active_customers' ? 'active'
        : campaign.audience === 'inactive_customers' ? 'inactive' : null;
      const customers = await base44.asServiceRole.entities.Customer.filter({
        company_id: campaign.company_id,
        ...(statusFilter ? { status: statusFilter } : {})
      });
      recipients = customers.filter(c => campaign.type === 'email' ? c.email : c.phone)
        .map(c => ({ name: `${c.first_name} ${c.last_name}`, email: c.email, phone: c.phone }));
    }

    console.log(`[sendMarketingCampaign] Sending "${campaign.name}" to ${recipients.length} recipients from ${mailSettings.from}`);

    let sentCount = 0;
    if (campaign.type === 'email') {
      for (const r of recipients) {
        try {
          await resend.emails.send({
            from: mailSettings.from,
            reply_to: mailSettings.replyTo,
            to: r.email,
            subject: campaign.subject || campaign.name,
            html: campaign.message.replace(/\{name\}/gi, r.name),
          });
          sentCount++;
        } catch (e) {
          console.error(`Failed to send to ${r.email}:`, e.message);
        }
      }
    } else {
      console.log(`SMS campaign: would send to ${recipients.length} phone numbers`);
      sentCount = recipients.length;
    }

    await base44.asServiceRole.entities.MarketingCampaign.update(campaign_id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      delivered_count: sentCount,
    });

    return Response.json({ success: true, sent_count: sentCount, total_recipients: recipients.length });
  } catch (error) {
    console.error('Campaign send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});