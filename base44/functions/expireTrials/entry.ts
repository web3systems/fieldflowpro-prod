import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all trialing subscriptions
    const trialingSubs = await base44.asServiceRole.entities.Subscription.filter({ status: 'trialing' });

    const now = new Date();
    let expired = 0;

    const EXEMPT_COMPANIES = [
      'parrow enterprises',
      'honey-do crew',
      'honey-do cleaning',
      'kiss my grass',
      'pretty little polishers',
    ];

    for (const sub of trialingSubs) {
      if (!sub.trial_ends_at) continue;

      // Check if company is exempt
      const company = await base44.asServiceRole.entities.Company.filter({ id: sub.company_id });
      const companyName = (company[0]?.name || '').toLowerCase().trim();
      if (EXEMPT_COMPANIES.some(e => companyName.includes(e))) {
        console.log(`Skipping exempt company: ${company[0]?.name}`);
        continue;
      }
      const trialEnd = new Date(sub.trial_ends_at);
      
      // If trial has ended and no active Stripe subscription (not yet converted)
      if (trialEnd < now && !sub.stripe_subscription_id) {
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'cancelled',
          cancelled_at: now.toISOString(),
        });

        // Deactivate the company
        await base44.asServiceRole.entities.Company.update(sub.company_id, {
          is_active: false,
        });

        // Send expiry email
        if (sub.owner_email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: sub.owner_email,
              subject: 'Your FieldFlow Pro trial has ended',
              body: `
                <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
                  <h2 style="color: #1e293b;">Your free trial has ended</h2>
                  <p>Hi ${sub.owner_name || sub.owner_email},</p>
                  <p>Your 14-day free trial of FieldFlow Pro has ended. Your account has been deactivated.</p>
                  <p>Don't lose access to your data — subscribe now to reactivate your account instantly.</p>
                  <p style="margin: 24px 0;">
                    <a href="https://app.fieldflowpro.com/Register" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                      Choose a Plan →
                    </a>
                  </p>
                  <p style="color: #64748b; font-size: 14px;">Questions? Contact us at support@fieldflowpro.com</p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                  <p style="color: #94a3b8; font-size: 12px;">FieldFlow Pro · Field Service Management</p>
                </div>
              `
            });
            console.log(`Trial expiry email sent to ${sub.owner_email}`);
          } catch (emailErr) {
            console.error(`Failed to send expiry email to ${sub.owner_email}: ${emailErr.message}`);
          }
        }

        console.log(`Expired trial for company ${sub.company_id}, owner: ${sub.owner_email}`);
        expired++;
      }
    }

    return Response.json({ checked: trialingSubs.length, expired });
  } catch (error) {
    console.error('expireTrials error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});