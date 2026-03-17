import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, company_id, return_url } = await req.json();

    const subs = await base44.asServiceRole.entities.Subscription.filter({ company_id });
    const sub = subs[0];

    if (action === 'get_status') {
      return Response.json({ subscription: sub || null });
    }

    if (action === 'create_portal') {
      if (!sub?.stripe_customer_id) {
        return Response.json({ error: 'No subscription found' }, { status: 404 });
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: return_url || `${req.headers.get('origin')}/Settings`,
      });
      return Response.json({ url: session.url });
    }

    if (action === 'cancel') {
      if (!sub?.stripe_subscription_id) {
        return Response.json({ error: 'No active subscription' }, { status: 404 });
      }
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      await base44.asServiceRole.entities.Subscription.update(sub.id, { status: 'cancelled' });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manageSubscription error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});