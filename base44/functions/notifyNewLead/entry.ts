import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let payload: any = {};
    try { payload = await req.json(); } catch (e) { payload = {}; }

    // Entity automation payload shape:
    //   { event: { type, entity_name, entity_id }, data: <lead>, old_data, changed_fields }
    const lead = payload.data || payload.lead || null;
    if (!lead) return Response.json({ skipped: true, reason: 'no lead data' });

    const companyId = lead.company_id;
    const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'New Lead';
    const detailLines = [
      'Name: ' + leadName,
      lead.phone ? 'Phone: ' + lead.phone : '',
      lead.email ? 'Email: ' + lead.email : '',
      lead.address ? 'Address: ' + lead.address : '',
      lead.service_interest ? 'Service: ' + lead.service_interest : '',
      lead.source ? 'Source: ' + lead.source : ''
    ].filter(Boolean);
    const subject = 'New lead received: ' + leadName;
    const bodyHtml = [
      '<div style="font-family: Arial, sans-serif; max-width:560px;">',
      '<h2 style="color:#1e293b;margin-bottom:8px;">A new lead just came in 🎉</h2>',
      '<p style="color:#475569;">A new lead has been created in FieldFlow Pro. Here are the details:</p>',
      '<table style="border-collapse:collapse;margin:12px 0;font-size:14px;">',
      ...detailLines.map(l => `<tr><td style="padding:6px 12px 6px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">${l.split(':')[0]}</td><td style="padding:6px 0;color:#1e293b;border-bottom:1px solid #f1f5f9;">${l.split(':').slice(1).join(':').trim()}</td></tr>`),
      '</table>',
      lead.notes ? '<p style="margin-top:16px;color:#475569;"><strong>Notes:</strong><br/>' + String(lead.notes).replace(/\n/g, '<br/>') + '</p>' : '',
      '<p style="margin-top:24px;"><a href="' + (Deno.env.get('APP_URL') || '') + '/LeadDetail/' + lead.id + '" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;">View Lead in FieldFlow Pro</a></p>',
      '</div>'
    ].join('\n');

    // Collect recipient emails: company managers/owners + platform super admins.
    const recipients = new Set<string>();

    if (companyId) {
      const access: any[] = await base44.asServiceRole.entities.UserCompanyAccess.filter({ company_id: companyId });
      const managerRoles = ['manager', 'owner'];
      for (const a of access) {
        if (managerRoles.includes(a.role) && a.user_email) recipients.add(a.user_email);
      }
    }

    try {
      const superAdmins: any[] = await base44.asServiceRole.entities.User.filter({ role: 'super_admin' });
      for (const u of superAdmins) { if (u.email) recipients.add(u.email); }
    } catch (e) {
      console.log('super admin lookup failed', e.message);
    }

    if (recipients.size === 0) {
      console.log('notifyNewLead: no recipients for lead', lead.id);
      return Response.json({ ok: true, sent: 0, reason: 'no recipients' });
    }

    let sent = 0;
    const errors: string[] = [];
    for (const email of recipients) {
      try {
        await base44.integrations.Core.SendEmail({ to: email, subject, body: bodyHtml });
        sent++;
      } catch (e) {
        errors.push(email + ': ' + e.message);
        console.log('SendEmail failed for', email, e.message);
      }
    }

    return Response.json({ ok: true, sent, attempted: recipients.size, errors });
  } catch (error) {
    console.error('notifyNewLead error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});