import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    // Get all active companies (skip sub-locations)
    const companies = await base44.asServiceRole.entities.Company.filter({ is_active: true });
    const parentCompanies = companies.filter((c) => !c.parent_company_id);

    let nudged = 0;
    let skipped = 0;

    for (const company of parentCompanies) {
      // Check if nudged in the last 23 hours
      if (company.onboarding_nudged_at) {
        const lastNudge = new Date(company.onboarding_nudged_at);
        const hoursSince = (Date.now() - lastNudge.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 23) {
          skipped++;
          continue;
        }
      }

      // Check onboarding steps
      const incomplete = [];

      // 1. Company profile (phone + email)
      if (!company.phone || !company.email) {
        incomplete.push('Complete your company profile (phone & email)');
      }

      // 2. Email setup
      const emailSettings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: company.id });
      if (!emailSettings.length || !emailSettings[0].mail_enabled) {
        incomplete.push('Set up your business email for sending estimates and invoices');
      }

      // 3. Stripe
      if (!company.stripe_onboarding_complete) {
        incomplete.push('Connect Stripe to accept customer payments');
      }

      // 4. Customers
      const customers = await base44.asServiceRole.entities.Customer.filter({ company_id: company.id }, null, 1);
      if (!customers.length) {
        incomplete.push('Add your first customer');
      }

      // Skip if everything is done
      if (incomplete.length === 0) {
        skipped++;
        continue;
      }

      // Find company owner to email
      const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({ company_id: company.id });
      const ownerAccess = access.find((a) => a.role === 'owner');

      let ownerEmail = company.email;
      if (ownerAccess?.user_email) {
        ownerEmail = ownerAccess.user_email;
      }

      if (!ownerEmail) {
        console.log(`No email found for company ${company.name}`);
        skipped++;
        continue;
      }

      // Build email
      const stepsHtml = incomplete
        .map((step) => `<li style="margin-bottom:6px;color:#334155;">${step}</li>`)
        .join('');

      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
        <h2 style="color:#1e293b;margin-bottom:8px;">👋 Almost there, ${company.name}!</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin-bottom:20px;">
          You're off to a great start with FieldFlow Pro. A few more steps will unlock everything — online payments, professional emails, and a smoother workflow for your team.
        </p>
        <p style="color:#1e293b;font-weight:600;font-size:14px;margin-bottom:12px;">What's left:</p>
        <ul style="padding-left:20px;margin-bottom:24px;">${stepsHtml}</ul>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
          You're on the free 14-day trial. Log into FieldFlow Pro to finish your setup before it ends.
        </p>
      </div>`;

      // Send via Resend API directly
      const mailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FieldFlow Pro <noreply@fieldflowpro.com>',
          to: [ownerEmail],
          subject: `${incomplete.length} step${incomplete.length > 1 ? 's' : ''} left — finish your FieldFlow Pro setup`,
          html,
        }),
      });

      if (!mailRes.ok) {
        const err = await mailRes.json();
        console.error(`Failed to send nudge to ${ownerEmail}:`, err);
        continue;
      }

      // Update nudged timestamp
      await base44.asServiceRole.entities.Company.update(company.id, {
        onboarding_nudged_at: new Date().toISOString(),
      });

      nudged++;
    }

    return Response.json({ nudged, skipped, total: parentCompanies.length });
  } catch (error) {
    console.error('onboardingNudge error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});