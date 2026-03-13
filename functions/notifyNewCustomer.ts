import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data } = payload;

    if (!data || !data.company_id) {
      return Response.json({ skipped: true, reason: "no customer data" });
    }

    const customer = data;
    const customerName = `${customer.first_name} ${customer.last_name}`;

    // Get company info
    const companies = await base44.asServiceRole.entities.Company.filter({ id: customer.company_id });
    const company = companies[0];

    // Get all users with notification settings for new_customer event enabled
    const notifSettings = await base44.asServiceRole.entities.NotificationSetting.filter({ company_id: customer.company_id });

    const recipients = notifSettings.filter(s => 
      s.is_enabled !== false && 
      s.events?.new_customer !== false &&
      s.user_email
    );

    console.log(`New customer "${customerName}" created. Notifying ${recipients.length} recipient(s).`);

    // Also create in-app notifications
    const notificationPromises = recipients.map(async (r) => {
      // In-app notification
      if (s.channels?.in_app !== false) {
        await base44.asServiceRole.entities.Notification.create({
          company_id: customer.company_id,
          user_email: r.user_email,
          title: "New Customer Added",
          message: `${customerName} was added as a new customer.`,
          type: "new_customer",
          is_read: false,
          related_entity_type: "customer",
          related_entity_id: customer.id,
          channels_sent: ["in_app"],
        });
      }

      // Email notification
      if (r.channels?.email !== false) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: r.user_email,
          subject: `New Customer: ${customerName} — ${company?.name || ""}`,
          body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#1e293b;margin:0 0 16px;">New Customer Added</h2>
            <p style="color:#475569;">A new customer has been added to <strong>${company?.name || "your account"}</strong>.</p>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0;">
              <p style="margin:0;color:#1e40af;font-weight:600;font-size:16px;">${customerName}</p>
              ${customer.email ? `<p style="margin:6px 0 0;color:#3b82f6;">✉️ ${customer.email}</p>` : ""}
              ${customer.phone ? `<p style="margin:4px 0 0;color:#3b82f6;">📞 ${customer.phone}</p>` : ""}
              ${customer.address ? `<p style="margin:4px 0 0;color:#3b82f6;">📍 ${customer.address}</p>` : ""}
              ${customer.source ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Source: ${customer.source}</p>` : ""}
            </div>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Log in to your dashboard to view this customer's full profile.</p>
          </div>`
        });
        console.log(`Email sent to ${r.user_email} for new customer ${customerName}`);
      }
    });

    await Promise.all(notificationPromises);

    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    console.error("Error in notifyNewCustomer:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});