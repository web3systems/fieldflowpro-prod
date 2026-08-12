import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@4.0.0';
import { secrets } from "base44:runtime";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

async function resolveMailSettings(base44, companyId) {
  const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
  const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';
  if (!companyId) return { error: 'No company_id', blocked: true };
  const settings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: companyId });
  const cfg = settings[0];
  if (!cfg || !cfg.mail_enabled) return { error: `Email not configured for company ${companyId}`, blocked: true };
  if (cfg.mail_domain_verified) {
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, enabled: true };
  }
  if (cfg.mail_fallback_allowed) {
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, enabled: true };
  }
  return { error: `Domain not verified and fallback not allowed for company ${companyId}`, blocked: true };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id, revision_id, company_id } = await req.json();
    if (!job_id || !revision_id) return Response.json({ error: 'job_id and revision_id required' }, { status: 400 });

    const jobs = await base44.entities.Job.filter({ id: job_id });
    const job = jobs[0];
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    const resolvedCompanyId = company_id || job.company_id;

    // Access check
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({ user_email: user.email, company_id: resolvedCompanyId });
      if (access.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const revision = (job.scope_of_work_revisions || []).find(r => r.id === revision_id);
    if (!revision) return Response.json({ error: 'Revision not found' }, { status: 404 });

    const customers = await base44.entities.Customer.filter({ id: job.customer_id });
    const customer = customers[0];
    if (!customer || !customer.email) return Response.json({ error: 'Customer has no email on file' }, { status: 400 });

    const companies = await base44.entities.Company.filter({ id: resolvedCompanyId });
    const company = companies[0];
    const companyName = company?.name || 'us';

    const appUrl = (secrets.get("APP_URL") || '').replace(/\/$/, '');
    if (!appUrl) return Response.json({ error: 'APP_URL not configured' }, { status: 500 });
    const signUrl = `${appUrl}/SowSign/${job_id}/${revision_id}`;

    const mailSettings = await resolveMailSettings(base44, resolvedCompanyId);
    if (mailSettings.blocked) return Response.json({ error: mailSettings.error }, { status: 400 });

    const firstName = customer.first_name || customer.business_name || 'there';
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <p style="color:#475569;">Hi ${firstName},</p>
      <p style="color:#475569;"><strong>${companyName}</strong> has updated the scope of work for your project <em>${job.title}</em> and needs your approval.</p>
      <p style="color:#475569;"><strong>${revision.title || 'Revised Statement of Work'}</strong></p>
      <div style="margin:28px 0;text-align:center;">
        <a href="${signUrl}" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Review &amp; Sign</a>
      </div>
      <p style="color:#64748b;font-size:14px;">This link will open the updated statement of work for your review and electronic signature.</p>
      <p style="color:#475569;">Thank you,<br/><strong>${companyName}</strong></p>
      ${company?.phone ? `<p style="color:#64748b;font-size:14px;">📞 ${company.phone}</p>` : ''}
    </div>`;

    await resend.emails.send({
      from: mailSettings.from,
      reply_to: mailSettings.replyTo,
      to: customer.email,
      subject: `Updated Scope of Work — ${job.title}`,
      html,
    });

    // Mark revision as pending + record send
    const updatedRevisions = (job.scope_of_work_revisions || []).map(r =>
      r.id === revision_id
        ? { ...r, status: r.status === 'signed' ? r.status : 'pending', sent_at: new Date().toISOString(), sent_to_email: customer.email }
        : r
    );
    await base44.entities.Job.update(job_id, { scope_of_work_revisions: updatedRevisions });

    return Response.json({ success: true, sent_to: customer.email });
  } catch (error) {
    console.error('sendSowForSignature error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}