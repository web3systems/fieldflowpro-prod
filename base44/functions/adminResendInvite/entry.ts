import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, name } = await req.json();

    // Re-invite via platform
    try {
      await base44.users.inviteUser(email, 'user');
    } catch (e) {
      console.log('Platform invite note:', e.message);
    }

    // Also send a welcome email with login link
    await resend.emails.send({
      from: 'FieldFlow Pro <notifications@fieldflowpro.com>',
      to: email,
      subject: 'Welcome to FieldFlow Pro — Set up your account',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e40af;">Welcome to FieldFlow Pro!</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Your FieldFlow Pro account is ready. Click the button below to log in and get started.</p>
          <p>If this is your first time, you may be prompted to set a password.</p>
          <p style="margin:24px 0;">
            <a href="https://app.fieldflowpro.com/Dashboard" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;">Access My Dashboard →</a>
          </p>
          <p style="color:#6b7280;font-size:13px;">Questions? Contact us at support@fieldflowpro.com</p>
        </div>
      `
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('adminResendInvite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});