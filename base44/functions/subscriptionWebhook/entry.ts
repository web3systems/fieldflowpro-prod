import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret || !sig) {
      console.error('Missing webhook secret or signature');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const { company_id, plan, owner_email, owner_name, module_key, module_name } = metadata;
      if (!company_id) return Response.json({ received: true });

      // Handle module subscription checkout
      if (module_key) {
        try {
          const existingModules = await base44.asServiceRole.entities.CompanyModule.filter({ company_id, module_key });
          const moduleData = {
            company_id,
            module_key,
            module_name: module_name || module_key,
            status: 'active',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            activated_at: new Date().toISOString(),
            cancelled_at: null,
          };
          if (existingModules[0]) {
            await base44.asServiceRole.entities.CompanyModule.update(existingModules[0].id, moduleData);
          } else {
            await base44.asServiceRole.entities.CompanyModule.create(moduleData);
          }
          console.log(`CompanyModule ${module_key} activated for company ${company_id}`);
        } catch (modErr) {
          console.error(`CompanyModule activation failed: ${modErr.message}`);
        }
        return Response.json({ received: true });
      }

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
          await base44.users.inviteUser(owner_email, "user");
          console.log(`Invited owner ${owner_email} to the app`);
        } catch (inviteErr) {
          // User may already exist — not a fatal error
          console.log(`Invite skipped for ${owner_email}: ${inviteErr.message}`);
        }

        // Create UserCompanyAccess so they can see their company on login
        try {
          const existing_access = await base44.asServiceRole.entities.UserCompanyAccess.filter({ user_email: owner_email, company_id });
          if (!existing_access[0]) {
            await base44.asServiceRole.entities.UserCompanyAccess.create({
              user_email: owner_email,
              company_id,
              role: 'manager',
              user_name: owner_name || '',
            });
            // Also update user_id if user exists
            try {
              const users = await base44.asServiceRole.entities.User.filter({ email: owner_email });
              if (users[0]) {
                await base44.asServiceRole.entities.UserCompanyAccess.update(
                  (await base44.asServiceRole.entities.UserCompanyAccess.filter({ user_email: owner_email, company_id }))[0]?.id,
                  { user_id: users[0].id }
                );
              }
            } catch (e) { /* non-fatal */ }
            console.log(`UserCompanyAccess created for ${owner_email} on company ${company_id}`);
          }
        } catch (accessErr) {
          console.error(`UserCompanyAccess creation failed: ${accessErr.message}`);
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
      const subId = stripeSub.id;
      const newStatus = stripeSub.cancel_at_period_end ? 'cancelled'
        : stripeSub.status === 'trialing' ? 'trialing'
        : stripeSub.status === 'past_due' ? 'past_due'
        : stripeSub.status === 'active' ? 'active' : stripeSub.status;

      // Update plan subscription if company_id in metadata
      if (company_id) {
        const existing = await base44.asServiceRole.entities.Subscription.filter({ company_id });
        if (existing[0]) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            status: newStatus,
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          });
        }
      }

      // Also update any CompanyModule linked to this subscription
      if (subId) {
        const mods = await base44.asServiceRole.entities.CompanyModule.filter({ stripe_subscription_id: subId });
        if (mods[0]) {
          const moduleStatus = newStatus === 'cancelled' ? 'cancelled'
            : newStatus === 'past_due' ? 'past_due'
            : newStatus === 'active' ? 'active'
            : mods[0].status;
          await base44.asServiceRole.entities.CompanyModule.update(mods[0].id, {
            status: moduleStatus,
            ...(moduleStatus === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
          });
          console.log(`CompanyModule ${mods[0].module_key} status → ${moduleStatus}`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const stripeSub = event.data.object;
      const company_id = stripeSub.metadata?.company_id;
      const subId = stripeSub.id;

      if (company_id) {
        const existing = await base44.asServiceRole.entities.Subscription.filter({ company_id });
        if (existing[0]) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          });
        }
      }

      // Cancel any CompanyModule linked to this subscription
      if (subId) {
        const mods = await base44.asServiceRole.entities.CompanyModule.filter({ stripe_subscription_id: subId });
        if (mods[0]) {
          await base44.asServiceRole.entities.CompanyModule.update(mods[0].id, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          });
          console.log(`CompanyModule ${mods[0].module_key} cancelled (subscription deleted)`);
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      // Find subscription record by stripe_customer_id
      const existing = await base44.asServiceRole.entities.Subscription.filter({ stripe_customer_id: customerId });
      const sub = existing[0];
      if (sub?.owner_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: sub.owner_email,
            subject: "Action Required: Payment failed for FieldFlow Pro",
            body: `
              <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Payment Failed</h2>
                <p>Hi ${sub.owner_name || sub.owner_email},</p>
                <p>We were unable to process your payment for FieldFlow Pro. Please update your payment method to avoid losing access.</p>
                <p style="margin: 24px 0;">
                  <a href="https://app.fieldflowpro.com/Dashboard" style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                    Update Payment Method →
                  </a>
                </p>
                <p style="color: #64748b; font-size: 14px;">If you need help, reply to this email or contact support@fieldflowpro.com</p>
              </div>
            `
          });
          console.log(`Payment failed email sent to ${sub.owner_email}`);
        } catch (emailErr) {
          console.error(`Payment failed email error: ${emailErr.message}`);
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('subscriptionWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});