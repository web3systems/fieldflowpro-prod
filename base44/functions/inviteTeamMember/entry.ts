import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const manager = await base44.auth.me();
    if (!manager) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { first_name, last_name, email, role, password, company_id, company_name } = await req.json();
    if (!first_name || !last_name || !email || !company_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify manager has access to this company
    const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({
      user_email: manager.email,
      company_id,
    });
    const allowedRoles = ['owner', 'manager', 'admin'];
    const canManage = manager.role === 'admin' || manager.role === 'super_admin' ||
      access.some(a => allowedRoles.includes(a.role));
    if (!canManage) {
      return Response.json({ error: 'Forbidden — only managers and admins can add team members' }, { status: 403 });
    }

    const userRole = role || 'user';

    // 1. Invite the user via the platform (creates User account + sends platform invite)
    await base44.users.inviteUser(email, userRole);

    // 2. If a password was provided, store it so it gets applied when they first log in
    if (password) {
      await base44.asServiceRole.entities.PendingPassword.create({ email, password });
    }

    // 3. Create the Technician record
    const tech = await base44.asServiceRole.entities.Technician.create({
      company_id,
      first_name,
      last_name,
      email,
      status: 'active',
    });

    // 4. Send a custom welcome email with credentials
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const appUrl = Deno.env.get('APP_URL') || 'https://app.fieldflowpro.com';
    const companyDisplay = company_name || 'the team';

    const generatedNote = password
      ? `<p style="margin:16px 0;background:#f0f9ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 6px 6px 0;">
           <strong style="color:#1e40af;">Your account credentials:</strong><br>
           <span style="color:#374151;">Email: <strong>${email}</strong></span><br>
           <span style="color:#374151;">Password: <strong>${password}</strong></span>
         </p>
         <p style="color:#6b7280;font-size:13px;">You can change your password anytime in your account settings.</p>`
      : `<p style="color:#6b7280;font-size:13px;">When you first sign in, you'll be prompted to create a password.</p>`;

    await resend.emails.send({
      from: 'FieldFlow Pro <notifications@fieldflowpro.com>',
      to: email,
      subject: `Welcome to ${companyDisplay} on FieldFlow Pro`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e3a5f;">Welcome to FieldFlow Pro!</h2>
          <p>Hi ${first_name},</p>
          <p><strong>${manager.full_name}</strong> has added you to <strong>${companyDisplay}</strong> as a <strong>${userRole}</strong>.</p>
          ${generatedNote}
          <p style="margin:24px 0;">
            <a href="${appUrl}/Dashboard" style="background:#3b82f6;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;">Go to Dashboard →</a>
          </p>
          <p style="color:#6b7280;font-size:13px;">If the button doesn't work, copy and paste this link into your browser:<br>${appUrl}/Dashboard</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="color:#9ca3af;font-size:12px;">Questions? Contact your manager or reply to this email.</p>
        </div>
      `,
    });

    console.log(`[inviteTeamMember] ${manager.email} invited ${email} as ${userRole} to company ${company_id}`);
    return Response.json({ success: true, technician: tech });
  } catch (error) {
    console.error('inviteTeamMember error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});