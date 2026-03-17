import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_IDS = {
  starter: 'price_1TBz4DPEbOjnaqMMQADp0xuA',
  professional: 'price_1TBz4DPEbOjnaqMMf2JHm3yW',
  enterprise: 'price_1TBz4DPEbOjnaqMM6KLChSbK',
};

Deno.serve(async (req) => {
  try {
    const { plan, company_id, owner_email, owner_name, success_url, cancel_url } = await req.json();

    if (!plan || !company_id || !owner_email) {
      return Response.json({ error: 'plan, company_id, and owner_email are required' }, { status: 400 });
    }

    const price_id = PRICE_IDS[plan];
    if (!price_id) return Response.json({ error: 'Invalid plan' }, { status: 400 });

    const base44 = createClientFromRequest(req);

    // Check for existing Stripe customer
    const existing = await base44.asServiceRole.entities.Subscription.filter({ company_id });
    let customerId = existing[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: owner_email,
        name: owner_name || owner_email,
        metadata: { company_id, base44_app_id: Deno.env.get('BASE44_APP_ID') }
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
      success_url: success_url || `${req.headers.get('origin')}/Dashboard?subscribed=true`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/Signup`,
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