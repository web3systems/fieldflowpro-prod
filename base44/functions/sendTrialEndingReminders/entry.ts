import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only callable by admin via automation
    const allSubs = await base44.asServiceRole.entities.Subscription.filter({ status: 'trialing' });

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    let sent = 0;
    for (const sub of allSubs) {
      if (!sub.trial_ends_at || !sub.owner_email) continue;
      const trialEnd = new Date(sub.trial_ends_at);

      // Send if trial ends within 3 days and hasn't expired yet
      if (trialEnd > now && trialEnd <= in3Days) {
        const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: sub.owner_email,
            subject: `Your FieldFlow Pro trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
            body: `
              <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
                <h2 style="color: #1e293b;">Your free trial is almost over</h2>
                <p>Hi ${sub.owner_name || sub.owner_email},</p>
                <p>Your FieldFlow Pro trial ends in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on ${trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
                <p>Subscribe now to keep access to all your jobs, customers, and invoices without interruption.</p>
                <p style="margin: 24px 0;">
                  <a href="https://app.fieldflowpro.com/Dashboard" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                    Subscribe Now →
                  </a>
                </p>
                <p style="color: #64748b; font-size: 14px;">Questions? Reply to this email or contact support@fieldflowpro.com</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px;">FieldFlow Pro · Field Service Management</p>
              </div>
            `
          });
          console.log(`Trial reminder sent to ${sub.owner_email}, ${daysLeft} days left`);
          sent++;
        } catch (err) {
          console.error(`Failed to send reminder to ${sub.owner_email}: ${err.message}`);
        }
      }
    }

    return Response.json({ sent, checked: allSubs.length });
  } catch (error) {
    console.error('sendTrialEndingReminders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});