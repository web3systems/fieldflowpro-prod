import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { company_id, plan, owner_email, owner_name } = session.metadata || {};
      if (!company_id) return Response.json({ received: true });

      const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
      const trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null;
      const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

      const existing = await base44.asServiceRole.entities.Subscription.filter({ company_id });
      const subData = {
        company_id,
        plan: plan || 'starter',
        status: stripeSub.status === 'trialing' ? 'trialing' : 'active',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_price_id: stripeSub.items.data[0]?.price?.id,
        trial_ends_at: trialEnd,
        current_period_end: periodEnd,
        owner_email: owner_email || '',
        owner_name: owner_name || '',
      };

      if (existing[0]) {
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, subData);
      } else {
        await base44.asServiceRole.entities.Subscription.create(subData);
      }
      console.log(`Subscription activated for company ${company_id}, plan ${plan}`);
    }

    if (event.type === 'customer.subscription.updated') {
      const stripeSub = event.data.object;
      const company_id = stripeSub.metadata?.company_id;
      if (!company_id) return Response.json({ received: true });

      const existing = await base44.asServiceRole.entities.Subscription.filter({ company_id });
      if (existing[0]) {
        const status = stripeSub.cancel_at_period_end ? 'cancelled'
          : stripeSub.status === 'trialing' ? 'trialing'
          : stripeSub.status === 'past_due' ? 'past_due'
          : stripeSub.status === 'active' ? 'active' : stripeSub.status;

        await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
          status,
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const stripeSub = event.data.object;
      const company_id = stripeSub.metadata?.company_id;
      if (company_id) {
        const existing = await base44.asServiceRole.entities.Subscription.filter({ company_id });
        if (existing[0]) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('subscriptionWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});