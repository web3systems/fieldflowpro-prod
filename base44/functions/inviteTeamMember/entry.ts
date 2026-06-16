import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const manager = await base44.auth.me();
    if (!manager) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { first_name, last_name, email, password, assignments } = await req.json();
    if (!first_name || !last_name || !email || !assignments?.length) {
      return Response.json({ error: 'Missing required fields: first_name, last_name, email, assignments' }, { status: 400 });
    }

    const isAdmin = manager.role === 'admin' || manager.role === 'super_admin';

    // Verify manager has access to every company in assignments
    for (const a of assignments) {
      if (!a.company_id) {
        return Response.json({ error: 'Each assignment must include company_id' }, { status: 400 });
      }
      if (!isAdmin) {
        const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({
          user_email: manager.email,
          company_id: a.company_id,
        });
        const allowedRoles = ['owner', 'manager'];
        if (!access.some(x => allowedRoles.includes(x.role))) {
          return Response.json({ error: `Forbidden — you don't have manager access to company ${a.company_id}` }, { status: 403 });
        }
      }
    }

    const platformRole = assignments.some(a => a.role === 'admin') ? 'admin' : 'user';

    // 1. Invite the user via the platform
    await base44.users.inviteUser(email, platformRole);

    // 2. Store password if provided
    if (password) {
      await base44.asServiceRole.entities.PendingPassword.create({ email, password });
    }

    // 3. Create UserCompanyAccess + Technician for each assignment
    const results = [];
    for (const a of assignments) {
      // Check for existing access
      const existing = await base44.asServiceRole.entities.UserCompanyAccess.filter({
        user_email: email,
        company_id: a.company_id,
      });
      if (!existing.length) {
        await base44.asServiceRole.entities.UserCompanyAccess.create({
          user_email: email,
          user_name: `${first_name} ${last_name}`,
          company_id: a.company_id,
          role: a.role || 'standard',
        });
      } else {
        await base44.asServiceRole.entities.UserCompanyAccess.update(existing[0].id, {
          role: a.role || 'standard',
        });
      }

      // Create Technician record
      const tech = await base44.asServiceRole.entities.Technician.create({
        company_id: a.company_id,
        first_name,
        last_name,
        email,
        status: 'active',
      });

      results.push({ company_id: a.company_id, role: a.role || 'standard', tech_id: tech.id });
    }

    // 4. Send branded welcome email
    const companyNames = assignments.map(a => a.company_name).filter(Boolean);
    const companyDisplay = companyNames.length
      ? companyNames.join(', ')
      : 'the team';

    const generatedNote = password
      ? `<p style="margin:16px 0;background:#f0f9ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 6px 6px 0;">
           <strong style="color:#1e40af;">Your account credentials:</strong><br>
           <span style="color:#374151;">Email: <strong>${email}</strong></span><br>
           <span style="color:#374151;">Password: <strong>${password}</strong></span>
         </p>
         <p style="color:#6b7280;font-size:13px;">You can change your password anytime in your account settings.</p>`
      : `<p style="color:#6b7280;font-size:13px;">When you first sign in, you'll be prompted to create a password.</p>`;

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const appUrl = Deno.env.get('APP_URL') || 'https://app.fieldflowpro.com';

    await resend.emails.send({
      from: 'FieldFlow Pro <notifications@fieldflowpro.com>',
      to: email,
      subject: `Welcome to FieldFlow Pro — ${manager.full_name} added you to ${companyDisplay}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e3a5f;">Welcome to FieldFlow Pro!</h2>
          <p>Hi ${first_name},</p>
          <p><strong>${manager.full_name}</strong> has added you to <strong>${companyDisplay}</strong>.</p>
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

    console.log(`[inviteTeamMember] ${manager.email} invited ${email} to ${results.length} companies`);
    return Response.json({ success: true, assignments: results });
  } catch (error) {
    console.error('inviteTeamMember error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});