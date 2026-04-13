import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    // Invite the user with admin role so they get proper platform access
    try {
      await base44.asServiceRole.users.inviteUser(owner_email, 'admin');
    } catch (inviteErr) {
      // User may already exist — not a fatal error
      console.warn('inviteUser warning:', inviteErr.message);
    }

    return Response.json({ success: true, company_id: company.id });

  } catch (error) {
    console.error('startFreeTrial error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});