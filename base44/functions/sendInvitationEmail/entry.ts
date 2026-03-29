import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function getSenderForCompany(company) {
  const name = (company?.name || '').toLowerCase();
  const slug = (company?.slug || '').toLowerCase();
  if (name.includes('pretty little') || slug.includes('pretty')) {
    return `${company.name} <notifications@prettylittlepolishers.com>`;
  }
  if (name.includes('honeydo clean') || slug.includes('honeydoclean')) {
    return `${company.name} <notifications@honeydoclean.com>`;
  }
  return `${company?.name || 'Honeydo Crew'} <notifications@honeydocrew.co>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, company_id, company_name } = await req.json();
    if (!email || !company_id) return Response.json({ error: 'Missing parameters' }, { status: 400 });

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({ user_email: user.email, company_id });
      if (access.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
    const company = companies[0];
    const fromAddress = getSenderForCompany(company);

    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `You're invited to ${company_name} on FieldFlow Pro`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <p>Hi,</p>
          <p>You've been invited to join <strong>${company_name}</strong> on FieldFlow Pro.</p>
          <p>Sign in or create an account to get started:</p>
          <p><a href="${Deno.env.get('APP_URL') || 'https://app.fieldflowpro.com'}/Register" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Accept Invitation</a></p>
          <p>Questions? Reply to this email or contact our support team.</p>
        </div>
      `
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendInvitationEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});