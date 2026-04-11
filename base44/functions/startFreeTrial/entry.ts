import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';
import { Resend } from 'npm:resend@4.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const PRICE_IDS = {
  starter: 'price_1TC3qE1h2Mdv0bDiUHlkJa2h',
  professional: 'price_1TC3qE1h2Mdv0bDi8fyZ8r78',
  enterprise: 'price_1TC3qE1h2Mdv0bDimkom51mZ',
};

Deno.serve(async (req) => {
  try {
    const { plan, company_name, company_phone, owner_email, owner_name, password } = await req.json();

    if (!plan || !owner_email || !company_name || !password) {
      return Response.json({ error: 'plan, owner_email, company_name, and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const price_id = PRICE_IDS[plan];
    if (!price_id) return Response.json({ error: 'Invalid plan' }, { status: 400 });

    const base44 = createClientFromRequest(req);

    // Check if company already exists for this email
    const existing = await base44.asServiceRole.entities.Company.filter({ email: owner_email });
    if (existing.length > 0) {
      return Response.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 400 });
    }

    // Create company
    const company = await base44.asServiceRole.entities.Company.create({
      name: company_name,
      email: owner_email,
      phone: company_phone || '',
      is_active: true,
    });

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: owner_email,
      name: owner_name || owner_email,
      metadata: { company_id: company.id, base44_app_id: Deno.env.get('BASE44_APP_ID') }
    });

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    const trialEndFormatted = trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Create subscription record
    await base44.asServiceRole.entities.Subscription.create({
      company_id: company.id,
      plan,
      status: 'trialing',
      stripe_customer_id: customer.id,
      stripe_price_id: price_id,
      trial_ends_at: trialEndsAt.toISOString(),
      owner_email,
      owner_name: owner_name || '',
    });

    // Create UserCompanyAccess record
    await base44.asServiceRole.entities.UserCompanyAccess.create({
      user_email: owner_email,
      company_id: company.id,
      role: 'manager',
      user_name: owner_name || '',
    });

    // Invite user as admin
    await base44.users.inviteUser(owner_email, 'admin');
    
    // Wait a moment for user to be created, then set password
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      await base44.asServiceRole.functions.invoke('setUserPassword', {
        email: owner_email,
        password: password
      });
      console.log(`Password set for ${owner_email}`);
    } catch (pwErr) {
      console.error(`Failed to set password for ${owner_email}:`, pwErr.message);
    }
    
    console.log(`Free trial started for ${owner_email}, company ${company.id}, plan ${plan}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('startFreeTrial error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});