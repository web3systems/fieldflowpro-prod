import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const manager = await base44.auth.me();
    if (!manager) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, password, first_name, company_name } = await req.json();
    if (!email || !password) {
      return Response.json({ error: 'email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const isAdmin = manager.role === 'admin' || manager.role === 'super_admin';

    if (!isAdmin) {
      // Check manager has access to at least one company the user belongs to
      const userAccess = await base44.asServiceRole.entities.UserCompanyAccess.filter({ user_email: email });
      const userCompanyIds = userAccess.map(a => a.company_id);
      const managerAccess = await base44.asServiceRole.entities.UserCompanyAccess.filter({
        user_email: manager.email,
        company_id: userCompanyIds,
      });
      const allowedRoles = ['owner', 'manager'];
      if (!managerAccess.some(a => allowedRoles.includes(a.role))) {
        return Response.json({ error: 'Forbidden — you do not manage any company this user belongs to' }, { status: 403 });
      }
    }

    // Store password as pending for next login
    const existing = await base44.asServiceRole.entities.PendingPassword.filter({ email });
    if (existing.length) {
      await base44.asServiceRole.entities.PendingPassword.update(existing[0].id, { password });
    } else {
      await base44.asServiceRole.entities.PendingPassword.create({ email, password });
    }

    // Send email notification to the user
    const displayName = first_name || email;
    const companyDisplay = company_name || 'the team';
    const appUrl = Deno.env.get('APP_URL') || 'https://app.fieldflowpro.com';

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    await resend.emails.send({
      from: 'FieldFlow Pro <notifications@fieldflowpro.com>',
      to: email,
      subject: 'Your password has been reset',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e3a5f;">Password Reset</h2>
          <p>Hi ${displayName},</p>
          <p><strong>${manager.full_name}</strong> has reset your password for <strong>${companyDisplay}</strong>.</p>
          <p style="margin:16px 0;background:#f0f9ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 6px 6px 0;">
            <strong style="color:#1e40af;">Your new password:</strong><br>
            <span style="color:#374151;"><strong>${password}</strong></span>
          </p>
          <p style="margin:24px 0;">
            <a href="${appUrl}/Dashboard" style="background:#3b82f6;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;">Go to Dashboard →</a>
          </p>
          <p style="color:#6b7280;font-size:13px;">You can change your password anytime in your account settings.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="color:#9ca3af;font-size:12px;">If you didn't expect this, contact your manager or reply to this email.</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('setUserPassword error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});