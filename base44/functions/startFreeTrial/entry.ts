import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_IDS = {
  starter: 'price_1TC3qE1h2Mdv0bDiUHlkJa2h',
  professional: 'price_1TC3qE1h2Mdv0bDi8fyZ8r78',
  enterprise: 'price_1TC3qE1h2Mdv0bDimkom51mZ',
};

Deno.serve(async (req) => {
  try {
    const { plan, company_name, company_phone, owner_email, owner_name } = await req.json();

    if (!plan || !owner_email || !company_name) {
      return Response.json({ error: 'plan, owner_email, and company_name are required' }, { status: 400 });
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

    // Create Stripe customer (no payment method required yet)
    const customer = await stripe.customers.create({
      email: owner_email,
      name: owner_name || owner_email,
      metadata: { company_id: company.id, base44_app_id: Deno.env.get('BASE44_APP_ID') }
    });

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create subscription record (trialing, no Stripe subscription yet)
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

    // Invite user to the platform
    await base44.asServiceRole.users.inviteUser(owner_email, 'user');

    // Send welcome email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owner_email,
      subject: `Welcome to FieldFlow Pro — Your 14-day trial has started!`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Welcome to FieldFlow Pro, ${owner_name || 'there'}!</h2>
          <p>Your 14-day free trial for <strong>${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan is now active.</p>
          <p>You'll receive a separate email to set your password and access your dashboard.</p>
          <p><strong>No credit card is required</strong> until your trial ends on ${trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
          <p>If you have any questions, reply to this email or reach us at support@fieldflowpro.com</p>
          <p style="color: #6b7280; font-size: 0.875rem;">— The FieldFlow Pro Team</p>
        </div>
      `
    });

    console.log(`Free trial started for ${owner_email}, company ${company.id}, plan ${plan}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('startFreeTrial error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});