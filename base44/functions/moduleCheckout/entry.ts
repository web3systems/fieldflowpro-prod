import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, company_id, module_key, stripe_price_id, module_name, success_url, cancel_url, stripe_subscription_id } = await req.json();

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    if (action === 'subscribe') {
      // Check if already active
      const existing = await base44.asServiceRole.entities.CompanyModule.filter({ company_id, module_key, status: 'active' });
      if (existing.length > 0) return Response.json({ error: 'Module already active' }, { status: 400 });

      // Get or create Stripe customer from the company's subscription
      const subs = await base44.asServiceRole.entities.Subscription.filter({ company_id });
      let stripeCustomerId = subs[0]?.stripe_customer_id;

      if (!stripeCustomerId) {
        const company = await base44.asServiceRole.entities.Company.filter({ id: company_id });
        const customer = await stripe.customers.create({
          email: user.email,
          name: company[0]?.name || user.full_name,
          metadata: { company_id, base44_app_id: Deno.env.get('BASE44_APP_ID') }
        });
        stripeCustomerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        line_items: [{ price: stripe_price_id, quantity: 1 }],
        success_url: success_url + '?module_success=' + module_key,
        cancel_url: cancel_url,
        metadata: {
          company_id,
          module_key,
          module_name,
          base44_app_id: Deno.env.get('BASE44_APP_ID')
        }
      });

      return Response.json({ checkout_url: session.url });
    }

    if (action === 'cancel') {
      if (!stripe_subscription_id) return Response.json({ error: 'No subscription id' }, { status: 400 });
      await stripe.subscriptions.cancel(stripe_subscription_id);
      await base44.asServiceRole.entities.CompanyModule.filter({ company_id, module_key })
        .then(mods => mods.forEach(m =>
          base44.asServiceRole.entities.CompanyModule.update(m.id, { status: 'cancelled', cancelled_at: new Date().toISOString() })
        ));
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('moduleCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});