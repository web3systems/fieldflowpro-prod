import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Staff invitations always send from the platform identity (not a company domain)
const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';

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

    await resend.emails.send({
      from: PLATFORM_FROM,
      reply_to: PLATFORM_REPLY_TO,
      to: email,
      subject: `You're invited to ${company_name} on FieldFlow Pro`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <p>Hi,</p>
          <p>You've been invited to join <strong>${company_name}</strong> on FieldFlow Pro.</p>
          <p>Sign in or create an account to get started:</p>
          <p><a href="${Deno.env.get('APP_URL') || 'https://fieldflowpro.com'}/Register" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Accept Invitation</a></p>
          <p>Questions? Reply to this email or contact our support team.</p>
        </div>
      `
    });

    console.log(`[sendInvitationEmail] Staff invite sent to ${email} for company ${company_name}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('sendInvitationEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});