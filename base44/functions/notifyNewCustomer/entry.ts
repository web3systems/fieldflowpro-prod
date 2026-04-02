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
    const { data } = payload;

    if (!data || !data.company_id) return Response.json({ skipped: true, reason: "no customer data" });
    if (data.imported === true) {
      console.log("Skipping notification for imported customer:", data.id);
      return Response.json({ skipped: true, reason: "imported record" });
    }

    const customer = data;
    const customerName = `${customer.first_name} ${customer.last_name}`;

    const companies = await base44.asServiceRole.entities.Company.filter({ id: customer.company_id });
    const company = companies[0];
    if (!company) return Response.json({ skipped: true, reason: "company not found" });

    const mailSettings = await resolveMailSettings(base44, customer.company_id);
    // For staff notifications, if mail not configured fall back silently (just do in-app)
    const canSendEmail = !mailSettings.blocked;

    const notifSettings = await base44.asServiceRole.entities.NotificationSetting.filter({ company_id: customer.company_id });
    let recipients = [];

    if (notifSettings.length > 0) {
      recipients = notifSettings
        .filter(s => s.is_enabled !== false && s.events?.new_customer !== false && s.user_email)
        .map(s => ({ email: s.user_email, inApp: s.channels?.in_app !== false, sendEmail: s.channels?.email !== false }));
    } else {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const registeredEmails = new Set(allUsers.map(u => u.email));
      const accesses = await base44.asServiceRole.entities.UserCompanyAccess.filter({ company_id: customer.company_id });
      const accessEmails = accesses.filter(a => a.user_email && registeredEmails.has(a.user_email)).map(a => a.user_email);
      const allEmails = new Set(accessEmails);
      if (company.created_by && registeredEmails.has(company.created_by)) allEmails.add(company.created_by);
      recipients = [...allEmails].map(email => ({ email, inApp: true, sendEmail: true }));
    }

    console.log(`[notifyNewCustomer] New customer "${customerName}" — notifying ${recipients.length} recipient(s)`);

    const emailBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e293b;margin:0 0 16px;">New Customer Added</h2>
      <p style="color:#475569;">A new customer has been added to <strong>${company.name}</strong>.</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0;color:#1e40af;font-weight:600;font-size:16px;">${customerName}</p>
        ${customer.email ? `<p style="margin:6px 0 0;color:#3b82f6;">✉️ ${customer.email}</p>` : ""}
        ${customer.phone ? `<p style="margin:4px 0 0;color:#3b82f6;">📞 ${customer.phone}</p>` : ""}
        ${customer.address ? `<p style="margin:4px 0 0;color:#3b82f6;">📍 ${customer.address}</p>` : ""}
        ${customer.source ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Source: ${customer.source}</p>` : ""}
      </div>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Log in to your dashboard to view this customer's full profile.</p>
    </div>`;

    const promises = recipients.map(async (r) => {
      if (r.inApp) {
        await base44.asServiceRole.entities.Notification.create({
          company_id: customer.company_id,
          user_email: r.email,
          title: "New Customer Added",
          message: `${customerName} was added as a new customer.`,
          type: "new_customer",
          is_read: false,
          related_entity_type: "customer",
          related_entity_id: customer.id,
          channels_sent: ["in_app"],
        });
      }
      if (r.sendEmail && canSendEmail) {
        await resend.emails.send({
          from: mailSettings.from,
          reply_to: mailSettings.replyTo,
          to: r.email,
          subject: `New Customer: ${customerName} — ${company.name}`,
          html: emailBody,
        });
        console.log(`[notifyNewCustomer] Email sent to ${r.email} from ${mailSettings.from}`);
      }
    });

    await Promise.all(promises);
    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    console.error("Error in notifyNewCustomer:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});