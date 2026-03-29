import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function getSenderForCompany(company) {
  const name = (company?.name || '').toLowerCase();
  const slug = (company?.slug || '').toLowerCase();
  if (name.includes('pretty little') || slug.includes('pretty')) {
    return `${company.name} <notifications@prettylittlepolishers.com>`;
  }
  if (name.includes('honeydo clean') || slug.includes('honeydoclean')) {
    return `${company.name} <notifications@honeydoclean.com>`;
  }
  return `${company?.name || 'Honeydo Crew'} <notifications@honeydocrew.co>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data } = payload;

    if (!data || !data.company_id) {
      return Response.json({ skipped: true, reason: "no customer data" });
    }

    // Skip notifications for bulk-imported records
    if (data.imported === true) {
      console.log("Skipping notification for imported customer:", data.id);
      return Response.json({ skipped: true, reason: "imported record" });
    }

    const customer = data;
    const customerName = `${customer.first_name} ${customer.last_name}`;

    // Get company info
    const companies = await base44.asServiceRole.entities.Company.filter({ id: customer.company_id });
    const company = companies[0];
    if (!company) return Response.json({ skipped: true, reason: "company not found" });

    // Get recipients: prefer NotificationSettings, fall back to all users with company access
    const notifSettings = await base44.asServiceRole.entities.NotificationSetting.filter({ company_id: customer.company_id });
    
    let recipients = [];

    if (notifSettings.length > 0) {
      // Use users who have new_customer notifications enabled
      recipients = notifSettings
        .filter(s => s.is_enabled !== false && s.events?.new_customer !== false && s.user_email)
        .map(s => ({ email: s.user_email, inApp: s.channels?.in_app !== false, sendEmail: s.channels?.email !== false }));
    } else {
      // Fallback: notify all registered app users who have access to this company
      const allUsers = await base44.asServiceRole.entities.User.list();
      const registeredEmails = new Set(allUsers.map(u => u.email));

      const accesses = await base44.asServiceRole.entities.UserCompanyAccess.filter({ company_id: customer.company_id });
      const accessEmails = accesses.filter(a => a.user_email && registeredEmails.has(a.user_email)).map(a => a.user_email);
      
      // Include company creator if registered
      const allEmails = new Set(accessEmails);
      if (company.created_by && registeredEmails.has(company.created_by)) {
        allEmails.add(company.created_by);
      }

      recipients = [...allEmails].map(email => ({ email, inApp: true, sendEmail: true }));
    }

    const fromAddress = getSenderForCompany(company);
    console.log(`New customer "${customerName}" — notifying ${recipients.length} recipient(s): ${recipients.map(r => r.email).join(", ")}`);

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
      if (r.sendEmail) {
        await resend.emails.send({
          from: fromAddress,
          to: r.email,
          subject: `New Customer: ${customerName} — ${company.name}`,
          html: emailBody,
        });
        console.log(`Email sent to ${r.email}`);
      }
    });

    await Promise.all(promises);

    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    console.error("Error in notifyNewCustomer:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});