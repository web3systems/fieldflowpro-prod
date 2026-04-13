import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { plan, company_name, company_phone, owner_email, owner_name, password } = await req.json();

    if (!plan || !owner_email || !company_name || !password) {
      return Response.json({ error: 'plan, owner_email, company_name, and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const existing = await base44.asServiceRole.entities.Company.filter({ email: owner_email });
    if (existing.length > 0) {
      return Response.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 400 });
    }

    const company = await base44.asServiceRole.entities.Company.create({
      name: company_name,
      email: owner_email,
      phone: company_phone || '',
      is_active: true,
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    await base44.asServiceRole.entities.Subscription.create({
      company_id: company.id,
      plan: plan.toLowerCase(),
      status: 'trialing',
      trial_ends_at: trialEndsAt.toISOString(),
      owner_email,
      owner_name: owner_name || '',
    });

    await base44.asServiceRole.entities.UserCompanyAccess.create({
      user_email: owner_email,
      user_id: null,
      company_id: company.id,
      role: 'admin',
      user_name: owner_name || '',
    });

    // Invite the user — this creates their account immediately
    try {
      await base44.users.inviteUser(owner_email, 'admin');
    } catch (inviteErr) {
      console.warn('inviteUser warning:', inviteErr.message);
    }

    // Wait for the user record to be created, then set their password directly
    let passwordSet = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise(r => setTimeout(r, 1500));
      const users = await base44.asServiceRole.entities.User.filter({ email: owner_email });
      if (users.length > 0) {
        const userId = users[0].id;
        await base44.asServiceRole.entities.User.update(userId, { password });
        console.log('Password set immediately for:', owner_email, 'on attempt', attempt + 1);
        passwordSet = true;

        // Clean up any pending password record
        const pending = await base44.asServiceRole.entities.PendingPassword.filter({ email: owner_email });
        for (const p of pending) {
          await base44.asServiceRole.entities.PendingPassword.delete(p.id);
        }
        break;
      }
    }

    if (!passwordSet) {
      // Fallback: store for applyPendingPassword to handle on first login
      console.warn('Could not set password immediately, storing as pending for:', owner_email);
      await base44.asServiceRole.entities.PendingPassword.create({ email: owner_email, password });
    }

    return Response.json({ success: true, company_id: company.id, password_set: passwordSet });

  } catch (error) {
    console.error('startFreeTrial error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});