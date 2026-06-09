import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@4.0.0';

// Inline mail resolver (no local imports allowed)
async function resolveMailSettings(base44, companyId) {
  const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
  const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';
  if (!companyId) return { error: 'No company_id', blocked: true };
  const settings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: companyId });
  const cfg = settings[0];
  if (!cfg || !cfg.mail_enabled) {
    // Fall back to platform sender if not configured
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, method: 'resend', enabled: true, fallbackUsed: true };
  }
  if (cfg.mail_method === 'smtp') {
    if (!cfg.smtp_host || !cfg.smtp_username) return { error: 'SMTP not fully configured', blocked: true };
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, method: 'smtp', enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_domain_verified) {
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, method: 'resend', enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_fallback_allowed !== false) {
    console.warn(`[MailResolver] Company ${companyId} using platform fallback`);
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, method: 'resend', enabled: true, fallbackUsed: true };
  }
  return { error: `Domain not verified and fallback not allowed for company ${companyId}`, blocked: true };
}

Deno.serve(async (req) => {
  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id, customer_id, note_content, company_id } = await req.json();
    if (!job_id || !customer_id || !note_content) {
      return Response.json({ error: 'job_id, customer_id, and note_content are required' }, { status: 400 });
    }

    // Fetch customer, job, and company in parallel
    const [customers, jobs, companies] = await Promise.all([
      base44.asServiceRole.entities.Customer.filter({ id: customer_id }),
      base44.asServiceRole.entities.Job.filter({ id: job_id }),
      company_id ? base44.asServiceRole.entities.Company.filter({ id: company_id }) : Promise.resolve([]),
    ]);

    const customer = customers[0];
    const job = jobs[0];
    const company = companies[0] || null;

    if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });
    if (!customer.email) return Response.json({ error: 'Customer has no email address' }, { status: 400 });
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    const resolvedCompanyId = company_id || job.company_id;

    // Resolve mail settings
    const mailSettings = await resolveMailSettings(base44, resolvedCompanyId);
    if (mailSettings.blocked) {
      console.error(`[sendJobNote] Blocked: ${mailSettings.error}`);
      return Response.json({ error: mailSettings.error }, { status: 400 });
    }

    // Branding
    const primaryColor = company?.primary_color || '#3B82F6';
    const companyName = company?.name || 'Your Service Provider';
    const logoUrl = company?.logo_url || null;
    const companyPhone = company?.phone || null;
    const companyEmail = company?.email || null;
    const customerFirstName = customer.first_name || customer.business_name || 'there';
    const jobTitle = job.title || 'Your Job';
    const subject = `Update on "${jobTitle}" from ${companyName}`;

    // Format date
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Convert newlines to HTML paragraphs
    const noteHtml = note_content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">${line}</p>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}dd 100%);padding:36px 40px;text-align:center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:52px;width:auto;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;">` : ''}
            <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Job Update</div>
            <div style="font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">${companyName}</div>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#111827;">Hi ${customerFirstName},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">We have a new update on your job below.</p>
          </td>
        </tr>

        <!-- Job Card -->
        <tr>
          <td style="padding:0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="background:${primaryColor}14;border-bottom:1px solid #e2e8f0;padding:12px 20px;">
                  <span style="font-size:11px;font-weight:700;color:${primaryColor};text-transform:uppercase;letter-spacing:1.5px;">&#128197; ${jobTitle}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:20px;">
                  ${noteHtml}
                  <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Sent ${dateStr} at ${timeStr}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

        <!-- Contact / Questions -->
        ${companyPhone || companyEmail ? `
        <tr>
          <td style="padding:28px 40px;">
            <table width="100%" style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;">
              <tr>
                <td style="padding:18px 24px;">
                  <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1px;">Questions? Contact Us</p>
                  <table cellpadding="0" cellspacing="0">
                    ${companyPhone ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">&#128222;&nbsp;&nbsp;<a href="tel:${companyPhone}" style="color:${primaryColor};font-weight:600;text-decoration:none;">${companyPhone}</a></td></tr>` : ''}
                    ${companyEmail ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">&#9993;&nbsp;&nbsp;<a href="mailto:${companyEmail}" style="color:${primaryColor};font-weight:600;text-decoration:none;">${companyEmail}</a></td></tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;border-top:1px solid #f1f5f9;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#374151;">${companyName}</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${now.getFullYear()} ${companyName}. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await resend.emails.send({
      from: mailSettings.from,
      reply_to: mailSettings.replyTo,
      to: customer.email,
      subject,
      html,
    });

    console.log(`[sendJobNote] Sent to ${customer.email} for job ${job_id} (fallback: ${mailSettings.fallbackUsed})`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('[sendJobNote] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});