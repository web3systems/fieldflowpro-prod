import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@4.0.0';

// Central mail resolver (inlined — no local imports in Deno functions)
async function resolveMailSettings(base44, companyId) {
  const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
  const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';
  if (!companyId) return { error: 'No company_id', blocked: true };
  const settings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: companyId });
  const cfg = settings[0];
  if (!cfg || !cfg.mail_enabled) {
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, method: 'resend', enabled: true, fallbackUsed: true };
  }
  if (cfg.mail_method === 'smtp') {
    if (!cfg.smtp_host || !cfg.smtp_username) return { error: 'SMTP not fully configured', blocked: true };
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, method: 'smtp', enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_domain_verified) {
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, method: 'resend', enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_fallback_allowed !== false) {
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, method: 'resend', enabled: true, fallbackUsed: true };
  }
  return { error: `Domain not verified and fallback not allowed for company ${companyId}`, blocked: true };
}

Deno.serve(async (req) => {
  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lead_id, contact_method, message, subject } = await req.json();
    if (!lead_id || !contact_method || !message) {
      return Response.json({ error: 'lead_id, contact_method and message are required' }, { status: 400 });
    }
    if (contact_method !== 'sms' && contact_method !== 'email') {
      return Response.json({ error: 'contact_method must be sms or email' }, { status: 400 });
    }

    const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id });
    const lead = leads[0];
    if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

    // Verify access
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({
        user_email: user.email,
        company_id: lead.company_id,
      });
      if (access.length === 0) return Response.json({ error: 'Forbidden: No access to this company' }, { status: 403 });
    }

    const companies = await base44.asServiceRole.entities.Company.filter({ id: lead.company_id });
    const company = companies[0];
    const companyName = company?.name || 'FieldFlow Pro';
    const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Lead';
    const activityTitle = contact_method === 'sms' ? 'SMS Reply' : 'Email Reply';
    const activityType = contact_method === 'sms' ? 'sms' : 'email';

    if (contact_method === 'sms') {
      if (!lead.phone) return Response.json({ error: 'Lead has no phone number' }, { status: 400 });

      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
      if (!accountSid || !authToken || !fromNumber) {
        console.error('[sendLeadReply] Twilio not configured');
        return Response.json({ error: 'SMS not configured' }, { status: 500 });
      }

      let toPhone = lead.phone.replace(/\D/g, '');
      if (toPhone.length === 10) toPhone = '+1' + toPhone;
      else if (!lead.phone.trim().startsWith('+')) toPhone = '+' + toPhone;

      const smsParams = new URLSearchParams();
      smsParams.append('From', fromNumber);
      smsParams.append('To', toPhone);
      smsParams.append('Body', message);

      const sms = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: smsParams.toString(),
      });
      const smsData = await sms.json().catch(() => ({}));
      if (!sms.ok) {
        console.error('[sendLeadReply] Twilio error:', JSON.stringify(smsData));
        return Response.json({ error: smsData.message || 'SMS failed' }, { status: 500 });
      }
    } else {
      if (!lead.email) return Response.json({ error: 'Lead has no email address' }, { status: 400 });
      const mailSettings = await resolveMailSettings(base44, lead.company_id);
      if (mailSettings.blocked) {
        console.error(`[sendLeadReply] Blocked: ${mailSettings.error}`);
        return Response.json({ error: mailSettings.error }, { status: 400 });
      }
      const emailSubject = subject || `Message from ${companyName}`;
      await resend.emails.send({
        from: mailSettings.from,
        reply_to: mailSettings.replyTo,
        to: lead.email,
        subject: emailSubject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <p style="color:#475569;">Hi ${lead.first_name || 'there'},</p>
          <div style="color:#334155;white-space:pre-wrap;background:#f8fafc;padding:16px;border-radius:8px;border-left:3px solid #e2e8f0;margin:16px 0;">${message.replace(/\n/g, '<br>')}</div>
          <p style="color:#94a3b8;font-size:12px;">— ${companyName}</p>
        </div>`,
        text: message,
      });
    }

    // Log activity
    await base44.asServiceRole.entities.Activity.create({
      company_id: lead.company_id,
      type: activityType,
      related_to_type: 'lead',
      related_to_id: lead_id,
      title: activityTitle,
      content: message,
      created_by_name: user.full_name || user.email || '',
    });

    // Auto-advance lead stage if still "new"
    if (lead.status === 'new') {
      await base44.asServiceRole.entities.Lead.update(lead_id, { status: 'contacted' });
    }

    console.log(`[sendLeadReply] ${contact_method} sent to lead ${lead_id} by ${user.email}`);
    return Response.json({ success: true });
  } catch (err) {
    console.error('sendLeadReply error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});