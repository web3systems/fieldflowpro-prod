import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Win-back sequence: send at 7 days and 30 days after cancellation
const WIN_BACK_DAYS = [7, 30];

const WIN_BACK_EMAILS = {
  7: {
    subject: "We miss you — come back to FieldFlow Pro",
    body: (name) => `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <div style="padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2>We noticed you left 👋</h2>
          <p>Hi ${name},</p>
          <p>It's been a week since your FieldFlow Pro account was cancelled. We'd love to have you back.</p>
          <p>If there was something we could have done better, reply to this email — we read every response.</p>
          <p>Ready to give it another shot? We'll restore all your data exactly where you left off.</p>
          <p style="margin: 28px 0;">
            <a href="https://app.fieldflowpro.com/Register" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Reactivate My Account →
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">FieldFlow Pro · support@fieldflowpro.com · <a href="#" style="color: #94a3b8;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },
  30: {
    subject: "A lot has changed at FieldFlow Pro — take another look",
    body: (name) => `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <div style="padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2>30 days later — here's what's new 🚀</h2>
          <p>Hi ${name},</p>
          <p>It's been 30 days since you left FieldFlow Pro. We've been busy — here's what's new:</p>
          <ul style="padding-left: 20px; line-height: 2; color: #475569;">
            <li>Improved AI estimator with smarter pricing suggestions</li>
            <li>Faster invoice-to-payment flow with Stripe</li>
            <li>Recurring jobs with auto-scheduling</li>
            <li>Enhanced customer portal with self-service booking</li>
          </ul>
          <p>If pricing was a concern, we'd love to help you find a plan that fits. Reply to this email and let's talk.</p>
          <p style="margin: 28px 0;">
            <a href="https://app.fieldflowpro.com/Register" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Come Back to FieldFlow Pro →
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">FieldFlow Pro · support@fieldflowpro.com · <a href="#" style="color: #94a3b8;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get recently cancelled subscriptions
    const cancelledSubs = await base44.asServiceRole.entities.Subscription.filter({ status: 'cancelled' });

    const now = new Date();
    let sent = 0;

    for (const sub of cancelledSubs) {
      if (!sub.cancelled_at || !sub.owner_email) continue;

      const cancelDate = new Date(sub.cancelled_at);
      const daysSinceCancel = Math.floor((now - cancelDate) / (1000 * 60 * 60 * 24));

      if (!WIN_BACK_DAYS.includes(daysSinceCancel)) continue;

      const email = WIN_BACK_EMAILS[daysSinceCancel];
      if (!email) continue;

      // Check if already sent (stored in notes)
      const alreadySent = (sub.notes || '').includes(`winback_${daysSinceCancel}`);
      if (alreadySent) continue;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: sub.owner_email,
          subject: email.subject,
          body: email.body(sub.owner_name || sub.owner_email.split('@')[0]),
        });

        const updatedNotes = `${sub.notes || ''} winback_${daysSinceCancel}`.trim();
        await base44.asServiceRole.entities.Subscription.update(sub.id, { notes: updatedNotes });

        console.log(`Win-back day ${daysSinceCancel} sent to ${sub.owner_email}`);
        sent++;
      } catch (err) {
        console.error(`Failed win-back to ${sub.owner_email}: ${err.message}`);
      }
    }

    return Response.json({ checked: cancelledSubs.length, sent });
  } catch (error) {
    console.error('sendWinBackEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});