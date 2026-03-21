import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_IDS = {
  starter: 'price_1TC3qE1h2Mdv0bDiUHlkJa2h',
  professional: 'price_1TC3qE1h2Mdv0bDi8fyZ8r78',
  enterprise: 'price_1TC3qE1h2Mdv0bDimkom51mZ',
};

Deno.serve(async (req) => {
  try {
    const { plan, company_id, company_name, company_phone, owner_email, owner_name, success_url, cancel_url } = await req.json();

    if (!plan || !owner_email) {
      return Response.json({ error: 'plan and owner_email are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Create company via service role if no company_id provided
    let resolvedCompanyId = company_id;
    if (!resolvedCompanyId) {
      if (!company_name) return Response.json({ error: 'company_name is required' }, { status: 400 });
      const company = await base44.asServiceRole.entities.Company.create({
        name: company_name,
        email: owner_email,
        phone: company_phone || '',
        is_active: true,
      });
      resolvedCompanyId = company.id;
    }
    const company_id_final = resolvedCompanyId;

    const price_id = PRICE_IDS[plan];
    if (!price_id) return Response.json({ error: 'Invalid plan' }, { status: 400 });

    // Check for existing Stripe customer
    const existing = await base44.asServiceRole.entities.Subscription.filter({ company_id: company_id_final });
    let customerId = existing[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: owner_email,
        name: owner_name || owner_email,
        metadata: { company_id: company_id_final, base44_app_id: Deno.env.get('BASE44_APP_ID') }
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { company_id, plan, base44_app_id: Deno.env.get('BASE44_APP_ID') }
      },
      metadata: {
        company_id,
        plan,
        owner_email,
        owner_name: owner_name || '',
        base44_app_id: Deno.env.get('BASE44_APP_ID')
      },
      success_url: success_url || `https://fieldflowpro.com/Dashboard?subscribed=true`,
      cancel_url: cancel_url || `https://fieldflowpro.com/Register`,
      allow_promotion_codes: true,
    });

    // Upsert pending subscription record
    if (existing[0]) {
      await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
        stripe_customer_id: customerId,
        stripe_price_id: price_id,
        plan,
        owner_email,
        owner_name: owner_name || '',
      });
    } else {
      await base44.asServiceRole.entities.Subscription.create({
        company_id,
        plan,
        status: 'trialing',
        stripe_customer_id: customerId,
        stripe_price_id: price_id,
        owner_email,
        owner_name: owner_name || '',
      });
    }

    console.log(`Checkout session created for company ${company_id}, plan ${plan}`);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createSubscriptionCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});