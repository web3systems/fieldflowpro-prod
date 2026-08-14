import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@4.0.0';
import { secrets } from "base44:runtime";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Always-notify recipient for new leads
const LEAD_NOTIFICATION_EMAIL = 'info@honeydocrew.co';

async function resolveMailSettings(base44, companyId) {
  const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
  const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';
  if (!companyId) return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, enabled: true, fallbackUsed: true };
  const settings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: companyId });
  const cfg = settings[0];
  if (!cfg || !cfg.mail_enabled) return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, enabled: true, fallbackUsed: true };
  if (cfg.mail_domain_verified) {
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_fallback_allowed) {
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, enabled: true, fallbackUsed: true };
  }
  return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, enabled: true, fallbackUsed: true };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let payload: any = {};
    try { payload = await req.json(); } catch (e) { payload = {}; }

    // Entity automation payload: { event: { type, entity_name, entity_id }, data: <lead> }
    // Also accept direct invocation: { lead_id } or { lead: {...} }
    let lead = payload.data || payload.lead || null;
    let leadId = lead?.id || payload.lead_id || payload.entity_id || null;

    // If we only have an ID, fetch the lead
    if (!lead && leadId) {
      const leads = await base44.asServiceRole.entities.Lead.filter({ id: leadId });
      lead = leads[0];
    }

    if (!lead) return Response.json({ skipped: true, reason: 'no lead data' });

    leadId = lead.id || leadId;

    const companyId = lead.company_id;
    const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.business_name || 'New Lead';
    const appUrl = (secrets.get("APP_URL") || '').replace(/\/$/, '');
    const leadUrl = `${appUrl}/LeadDetail/${leadId}`;

    // Resolve company for branding (resilient to missing/invalid IDs)
    let company = null;
    if (companyId) {
      try {
        const companies = await base44.asServiceRole.entities.Company.filter({ id: companyId });
        company = companies[0];
      } catch (e) {
        console.log('Company lookup failed (non-fatal):', e.message);
      }
    }
    const companyName = company?.name || 'FieldFlow Pro';
    const accentColor = company?.primary_color || '#00c98d';

    // Build email content
    const detailRows = [
      { label: 'Name', value: leadName },
      { label: 'Email', value: lead.email || '—' },
      { label: 'Phone', value: lead.phone || '—' },
      { label: 'Address', value: lead.address || '—' },
      { label: 'Service Interest', value: lead.service_interest || '—' },
      { label: 'Source', value: lead.source || 'Manual / Other' },
      { label: 'Estimated Value', value: lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : '—' },
      { label: 'Follow-up Date', value: lead.follow_up_date || '—' },
    ].filter(r => r.value && r.value !== '—');

    const subject = `New Lead: ${leadName}${lead.source ? ` (${lead.source})` : ''}`;
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:${accentColor};height:4px;border-radius:4px;margin-bottom:20px;"></div>
      <h2 style="color:#1e293b;margin:0 0 4px;">New Lead Received 🎉</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">A new lead was just created in ${companyName}.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px;">
        ${detailRows.map(r => `<tr>
          <td style="padding:8px 12px 8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;white-space:nowrap;vertical-align:top;">${r.label}</td>
          <td style="padding:8px 0;color:#1e293b;border-bottom:1px solid #f1f5f9;">${r.value}</td>
        </tr>`).join('')}
      </table>
      ${lead.notes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="color:#64748b;font-size:13px;font-weight:600;margin:0 0 6px;">Notes / Message:</p>
        <p style="color:#334155;margin:0;white-space:pre-wrap;">${String(lead.notes).replace(/</g,'&lt;').replace(/\n/g,'<br/>')}</p>
      </div>` : ''}
      <div style="margin:28px 0;text-align:center;">
        <a href="${leadUrl}" style="display:inline-block;background:${accentColor};color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">View Lead in FieldFlow Pro →</a>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:24px;">
        Lead ID: ${leadId}<br/>
        This notification was sent automatically when the lead was created.
      </p>
    </div>`;

    // Resolve mail settings for the company
    const mailSettings = await resolveMailSettings(base44, companyId);

    // Collect recipients: always include info@honeydocrew.co, plus company managers/owners
    const recipients = new Set<string>();
    recipients.add(LEAD_NOTIFICATION_EMAIL);

    if (companyId) {
      try {
        const access: any[] = await base44.asServiceRole.entities.UserCompanyAccess.filter({ company_id: companyId });
        for (const a of access) {
          if (['manager', 'owner'].includes(a.role) && a.user_email) {
            recipients.add(a.user_email);
          }
        }
      } catch (e) {
        console.log('UserCompanyAccess lookup failed (non-fatal):', e.message);
      }
    }

    let sent = 0;
    const errors: string[] = [];
    for (const email of recipients) {
      try {
        await resend.emails.send({
          from: mailSettings.from,
          reply_to: mailSettings.replyTo,
          to: email,
          subject,
          html,
        });
        sent++;
        console.log(`[sendLeadNotification] Email sent to ${email}`);
      } catch (e) {
        errors.push(`${email}: ${e.message}`);
        console.error(`[sendLeadNotification] Failed for ${email}:`, e.message);
      }
    }

    return Response.json({ success: true, sent, attempted: recipients.size, lead_id: leadId, errors: errors.length ? errors : undefined });
  } catch (error) {
    console.error('sendLeadNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}