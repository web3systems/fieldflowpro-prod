import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';
import Stripe from 'npm:stripe@14.21.0';

const LIFETIME_PRICE_ID = 'price_1Tt9EK1h2Mdv0bDiGpnLn7Jb';

Deno.serve(async (req) => {
  try {
    const { company_id, company_name, owner_email, owner_name, success_url, cancel_url } = await req.json();

    if (!owner_email) {
      return Response.json({ error: 'owner_email is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Resolve company if provided
    let resolvedCompanyId = company_id;
    if (!resolvedCompanyId && company_name) {
      const company = await base44.asServiceRole.entities.Company.create({
        name: company_name,
        email: owner_email,
        is_active: true,
      });
      resolvedCompanyId = company.id;
    }

    // Find or create Stripe customer
    let customerId: string | undefined;
    if (resolvedCompanyId) {
      const existing = await base44.asServiceRole.entities.Subscription.filter({ company_id: resolvedCompanyId });
      customerId = existing[0]?.stripe_customer_id;
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: owner_email,
        name: owner_name || owner_email,
        metadata: {
          company_id: resolvedCompanyId || '',
          base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: LIFETIME_PRICE_ID, quantity: 1 }],
      metadata: {
        company_id: resolvedCompanyId || '',
        plan: 'lifetime',
        owner_email,
        owner_name: owner_name || '',
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      },
      success_url: success_url || `${window_url()}Dashboard?lifetime=true`,
      cancel_url: cancel_url || `${window_url()}Landing`,
      allow_promotion_codes: true,
    });

    // NOTE: Subscription activation is deferred to the Stripe webhook
    // (checkout.session.completed) — never grant lifetime access before
    // payment is confirmed. The checkout session metadata carries the
    // company_id and plan so the webhook can upsert the subscription safely.

    console.log(`Lifetime checkout created for ${owner_email}`);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createLifetimeCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Build a reasonable success URL when none provided
function window_url() {
  const url = Deno.env.get('APP_URL') || 'https://fieldflowpro.com/';
  return url.endsWith('/') ? url : `${url}/`;
}