import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Prevent invited employees from accidentally creating a brand-new orphan
    // company through the public Register form. If this email already has
    // team access to any company, they are an existing team member — not a
    // new owner. They should sign in instead.
    const existingAccess = await base44.asServiceRole.entities.UserCompanyAccess.filter({ user_email: owner_email });
    if (existingAccess.length > 0) {
      return Response.json({
        error: 'This email is already part of a team. Please sign in with your existing account instead of starting a new trial.',
      }, { status: 400 });
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

    // Register user directly — no email confirmation sent
    try {
      const registerResult = await base44.auth.register({ email: owner_email, password, fullName: owner_name || owner_email });
      console.log('User registered:', owner_email, JSON.stringify(registerResult));
    } catch (registerErr) {
      console.error('register failed:', JSON.stringify(registerErr));
      const errMsg = registerErr?.data?.detail?.[0]?.msg || registerErr?.message || String(registerErr);
      return Response.json({ error: 'Could not create user account. ' + errMsg }, { status: 500 });
    }

    // Wait for user record to exist, then set role to admin
    let userId = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
      const users = await base44.asServiceRole.entities.User.filter({ email: owner_email });
      if (users.length > 0) {
        userId = users[0].id;
        await base44.asServiceRole.entities.User.update(userId, { role: 'admin' });
        break;
      }
    }

    // Create UserCompanyAccess with the user_id
    await base44.asServiceRole.entities.UserCompanyAccess.create({
      user_email: owner_email,
      user_id: userId,
      company_id: company.id,
      role: 'manager',
      user_name: owner_name || '',
    });

    return Response.json({ success: true, company_id: company.id });

  } catch (error) {
    console.error('startFreeTrial error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});