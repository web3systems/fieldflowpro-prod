import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Trial drip sequence: day 1, day 3, day 7, day 13
const DRIP_DAYS = [1, 3, 7, 13];

const DRIP_EMAILS = {
  1: {
    subject: "Welcome to FieldFlow Pro — here's how to get the most out of your trial",
    body: (name) => `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <div style="background: #3b82f6; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to FieldFlow Pro! 🎉</h1>
        </div>
        <div style="padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
          <p>Hi ${name},</p>
          <p>Your 14-day free trial has started. Here are the 3 things most users do first to get value fast:</p>
          <ol style="padding-left: 20px; line-height: 2;">
            <li><strong>Add your first customer</strong> — it takes 30 seconds</li>
            <li><strong>Create an estimate</strong> — send a professional quote from your phone</li>
            <li><strong>Set up your company profile</strong> — your logo and info appear on all documents</li>
          </ol>
          <p style="margin: 28px 0;">
            <a href="https://app.fieldflowpro.com/Dashboard" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Go to Dashboard →
            </a>
          </p>
          <p style="color: #64748b; font-size: 14px;">Questions? Reply to this email — a real person will answer.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">FieldFlow Pro · support@fieldflowpro.com</p>
        </div>
      </div>
    `,
  },
  3: {
    subject: "Quick tip: Send your first estimate in 2 minutes",
    body: (name) => `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <div style="padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e293b;">Day 3 tip: Estimates that win jobs 💼</h2>
          <p>Hi ${name},</p>
          <p>You're 3 days into your trial. One of the biggest time-savers our users love is the <strong>estimate builder</strong>.</p>
          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Here's how it works:</strong></p>
            <p style="margin: 8px 0 0;">Pick a customer → add line items from your price book → send a professional PDF link → customer approves online. Done.</p>
          </div>
          <p>Most businesses send their first estimate in under 2 minutes.</p>
          <p style="margin: 28px 0;">
            <a href="https://app.fieldflowpro.com/Estimates" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Create an Estimate →
            </a>
          </p>
          <p style="color: #64748b; font-size: 14px;">11 days left in your trial. No pressure — just making sure you see what's possible.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">FieldFlow Pro · support@fieldflowpro.com</p>
        </div>
      </div>
    `,
  },
  7: {
    subject: "Halfway through your trial — here's what you might be missing",
    body: (name) => `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <div style="padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e293b;">Day 7 — you're halfway there 📅</h2>
          <p>Hi ${name},</p>
          <p>You've got 7 days left. Here are features our most successful users say changed how they run their business:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f8fafc;">
              <td style="padding: 12px; border-radius: 8px 0 0 8px; font-weight: bold;">📱 Customer Portal</td>
              <td style="padding: 12px;">Customers approve estimates & pay invoices online — without calling you</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: bold;">📆 Recurring Jobs</td>
              <td style="padding: 12px;">Auto-create repeat service jobs — never miss a regular customer</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 12px; border-radius: 8px 0 0 8px; font-weight: bold;">💳 Online Payments</td>
              <td style="padding: 12px;">Connect Stripe and get paid the same day — cards, bank transfers</td>
            </tr>
          </table>
          <p style="margin: 28px 0;">
            <a href="https://app.fieldflowpro.com/Dashboard" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Explore These Features →
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">FieldFlow Pro · support@fieldflowpro.com</p>
        </div>
      </div>
    `,
  },
  13: {
    subject: "⚠️ Your trial ends tomorrow — keep your data and stay active",
    body: (name) => `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <div style="background: #ef4444; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">⏰ Your trial ends tomorrow</h1>
        </div>
        <div style="padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
          <p>Hi ${name},</p>
          <p>Your 14-day FieldFlow Pro trial ends <strong>tomorrow</strong>. After that, your account will be paused and you'll lose access to your jobs, customers, and invoices.</p>
          <p><strong>Subscribe today for as little as $49/month</strong> — no setup fees, cancel anytime.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #166534; font-weight: 600;">✅ Your data is safe as long as you subscribe before your trial ends.</p>
          </div>
          <p style="margin: 28px 0; text-align: center;">
            <a href="https://app.fieldflowpro.com/CompanySettings" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 16px;">
              Choose a Plan Now →
            </a>
          </p>
          <p style="color: #64748b; font-size: 14px; text-align: center;">Questions? Email us at support@fieldflowpro.com — we're happy to help.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">FieldFlow Pro · Field Service Management</p>
        </div>
      </div>
    `,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const allSubs = await base44.asServiceRole.entities.Subscription.filter({ status: 'trialing' });

    const now = new Date();
    let sent = 0;

    for (const sub of allSubs) {
      if (!sub.trial_ends_at || !sub.owner_email || !sub.created_date) continue;

      const trialEnd = new Date(sub.trial_ends_at);
      if (trialEnd < now) continue; // already expired

      const startDate = new Date(sub.created_date);
      const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

      // Check if today is a drip day
      if (!DRIP_DAYS.includes(daysSinceStart)) continue;

      const drip = DRIP_EMAILS[daysSinceStart];
      if (!drip) continue;

      // Avoid duplicate: check sent_drip_days field (stored as comma-separated string)
      const sentDays = (sub.notes || '').includes(`drip_${daysSinceStart}`);
      if (sentDays) continue;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: sub.owner_email,
          subject: drip.subject,
          body: drip.body(sub.owner_name || sub.owner_email.split('@')[0]),
        });

        // Mark this drip as sent in subscription notes
        const updatedNotes = `${sub.notes || ''} drip_${daysSinceStart}`.trim();
        await base44.asServiceRole.entities.Subscription.update(sub.id, { notes: updatedNotes });

        console.log(`Drip day ${daysSinceStart} sent to ${sub.owner_email}`);
        sent++;
      } catch (err) {
        console.error(`Failed drip to ${sub.owner_email}: ${err.message}`);
      }
    }

    return Response.json({ checked: allSubs.length, sent });
  } catch (error) {
    console.error('sendTrialDripEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});