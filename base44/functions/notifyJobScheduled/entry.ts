import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

async function resolveMailSettings(base44, companyId) {
  const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
  const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';
  if (!companyId) return { error: 'No company_id', blocked: true };
  const settings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: companyId });
  const cfg = settings[0];
  if (!cfg || !cfg.mail_enabled) return { error: `Email not configured for company ${companyId}`, blocked: true };
  if (cfg.mail_domain_verified) {
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_fallback_allowed) {
    console.warn(`[MailResolver] Company ${companyId} using platform fallback`);
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, enabled: true, fallbackUsed: true };
  }
  return { error: `Domain not verified and fallback not allowed for company ${companyId}`, blocked: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data, old_data } = payload;

    if (!data || data.status !== "scheduled") return Response.json({ skipped: true });
    if (old_data?.status === "scheduled") return Response.json({ skipped: true });
    if (!data.scheduled_start) return Response.json({ skipped: true });
    if (data.imported === true) return Response.json({ skipped: true, reason: "imported record" });
    if (!data.company_id) return Response.json({ skipped: true, reason: "no company_id" });

    const customers = await base44.asServiceRole.entities.Customer.filter({ id: data.customer_id });
    const customer = customers[0];
    if (!customer?.email) return Response.json({ skipped: true, reason: "no customer email" });

    const companies = await base44.asServiceRole.entities.Company.filter({ id: data.company_id });
    const company = companies[0];

    const mailSettings = await resolveMailSettings(base44, data.company_id);
    if (mailSettings.blocked) {
      console.warn(`[notifyJobScheduled] Blocked: ${mailSettings.error}`);
      return Response.json({ skipped: true, reason: mailSettings.error });
    }

    const dateStr = new Date(data.scheduled_start).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = new Date(data.scheduled_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    await resend.emails.send({
      from: mailSettings.from,
      reply_to: mailSettings.replyTo,
      to: customer.email,
      subject: `Appointment Confirmed — ${dateStr}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e293b;margin:0 0 16px;">Appointment Confirmed ✓</h2>
        <p style="color:#475569;">Hi ${customer.first_name},</p>
        <p style="color:#475569;">Your appointment with <strong>${company?.name}</strong> has been scheduled.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:0;color:#166534;font-weight:600;font-size:16px;">${data.title}</p>
          <p style="margin:8px 0 0;color:#16a34a;">📅 ${dateStr} at ${timeStr}</p>
          ${data.address ? `<p style="margin:6px 0 0;color:#16a34a;">📍 ${data.address}</p>` : ""}
        </div>
        ${data.description ? `<p style="color:#64748b;font-size:14px;">${data.description}</p>` : ""}
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Questions? Contact ${company?.phone || company?.email || "us"}.</p>
      </div>`
    });

    console.log(`[notifyJobScheduled] Sent to ${customer.email} from ${mailSettings.from} (fallback: ${mailSettings.fallbackUsed})`);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error in notifyJobScheduled:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});