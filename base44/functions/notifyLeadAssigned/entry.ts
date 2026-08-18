import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: any = {};
    try { payload = await req.json(); } catch (e) { payload = {}; }
    const leadId = payload.lead_id || payload.id;
    if (!leadId) return Response.json({ error: 'lead_id required' }, { status: 400 });

    const leads = await base44.entities.Lead.filter({ id: leadId });
    const lead = leads[0];
    if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

    const assigneeId = lead.assigned_to;
    if (!assigneeId) return Response.json({ skipped: true, reason: 'no assignee' });

    // Resolve the assignee's email/name from UserCompanyAccess (service role bypasses RLS).
    const access: any[] = await base44.asServiceRole.entities.UserCompanyAccess.filter({ company_id: lead.company_id });
    const assignee = access.find(a => a.user_id === assigneeId || a.user_email === assigneeId);
    if (!assignee || !assignee.user_email) {
      return Response.json({ skipped: true, reason: 'assignee email not found' });
    }

    const assigneeName = assignee.user_name || assignee.user_email;
    const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'A new lead';
    const detailLines = [
      lead.phone ? 'Phone: ' + lead.phone : '',
      lead.email ? 'Email: ' + lead.email : '',
      lead.address ? 'Address: ' + lead.address : '',
      lead.service_interest ? 'Service: ' + lead.service_interest : '',
      lead.source ? 'Source: ' + lead.source : '',
      lead.estimated_value ? 'Est. Value: $' + lead.estimated_value : '',
    ].filter(Boolean);

    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    const subject = `You've been assigned a lead: ${leadName}`;
    const bodyHtml = `<div style="font-family:Arial,sans-serif;max-width:560px;">
  <h2 style="color:#1e293b;margin-bottom:8px;">A lead has been assigned to you</h2>
  <p style="color:#475569;">Hi ${assigneeName},</p>
  <p style="color:#475569;">A lead has been assigned to you in FieldFlow Pro. Here are the details:</p>
  <p style="font-size:16px;color:#1e293b;"><strong>${leadName}</strong></p>
  <table style="border-collapse:collapse;margin:12px 0;font-size:14px;">
    ${detailLines.map(l => `<tr><td style="padding:6px 12px 6px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">${l.split(':')[0]}</td><td style="padding:6px 0;color:#1e293b;border-bottom:1px solid #f1f5f9;">${l.split(':').slice(1).join(':').trim()}</td></tr>`).join('')}
  </table>
  ${lead.notes ? `<p style="color:#475569;"><strong>Notes:</strong><br/>${String(lead.notes).replace(/\n/g, '<br/>')}</p>` : ''}
  ${appUrl ? `<p style="margin-top:24px;"><a href="${appUrl}/LeadDetail/${lead.id}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;">View Lead in FieldFlow Pro</a></p>` : ''}
</div>`;

    await base44.integrations.Core.SendEmail({ to: assignee.user_email, subject, body: bodyHtml });
    return Response.json({ ok: true, sent_to: assignee.user_email });
  } catch (error) {
    console.error('notifyLeadAssigned error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});