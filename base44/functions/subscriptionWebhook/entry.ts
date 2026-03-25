import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
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

      // Auto-invite the owner so they can log in
      if (owner_email) {
        try {
          await base44.asServiceRole.users.inviteUser(owner_email, "user");
          console.log(`Invited owner ${owner_email} to the app`);
        } catch (inviteErr) {
          // User may already exist — not a fatal error
          console.log(`Invite skipped for ${owner_email}: ${inviteErr.message}`);
        }

        // Send welcome email with login link
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: owner_email,
            subject: "Welcome to FieldFlow Pro — Your account is ready!",
            body: `
              <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
                <h2 style="color: #1e293b;">Welcome to FieldFlow Pro, ${owner_name || owner_email}!</h2>
                <p>Your <strong>${plan}</strong> subscription is now active and your account is ready to go.</p>
                <p>Click below to sign in and get started:</p>
                <p style="margin: 24px 0;">
                  <a href="https://app.fieldflowpro.com/Dashboard" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                    Go to My Dashboard →
                  </a>
                </p>
                <p style="color: #64748b; font-size: 14px;">You'll receive a separate email to set your password. If you have any questions, just reply to this email.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px;">FieldFlow Pro · Field Service Management</p>
              </div>
            `
          });
          console.log(`Welcome email sent to ${owner_email}`);
        } catch (emailErr) {
          console.error(`Welcome email failed for ${owner_email}: ${emailErr.message}`);
        }
      }
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