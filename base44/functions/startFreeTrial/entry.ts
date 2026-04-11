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
    const trialEndFormatted = trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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

    // Send welcome email via Resend
    await resend.emails.send({
      from: 'FieldFlow Pro <notifications@fieldflowpro.com>',
      to: owner_email,
      subject: 'Welcome to FieldFlow Pro — Your 14-day trial has started!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e40af;">Welcome to FieldFlow Pro, ${owner_name || 'there'}!</h2>
          <p>Your <strong>${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan trial is now active.</p>
          <p>You should receive a separate email shortly with a link to set your password and access your dashboard.</p>
          <p><strong>No credit card is required</strong> until your trial ends on <strong>${trialEndFormatted}</strong>.</p>
          <p>Once you've set your password, log in here:</p>
          <p style="margin: 24px 0;">
            <a href="https://app.fieldflowpro.com/Dashboard" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;">Go to Dashboard →</a>
          </p>
          <p style="color:#6b7280;font-size:13px;">Questions? Contact us at support@fieldflowpro.com</p>
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