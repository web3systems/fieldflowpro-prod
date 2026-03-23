import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { company_id, first_name, last_name, email, phone, address, service_type, preferred_date, preferred_time, notes, customer_id } = body;

    if (!company_id || !first_name || !last_name || !service_type) {
      return Response.json({ error: 'Missing required fields: company_id, first_name, last_name, service_type' }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.ServiceBooking.create({
      company_id,
      customer_id: customer_id || "",
      first_name,
      last_name,
      email: email || "",
      phone: phone || "",
      address: address || "",
      service_type,
      preferred_date: preferred_date || "",
      preferred_time: preferred_time || "",
      notes: notes || "",
      status: 'pending',
    });

    console.log('Booking created:', booking.id, 'for company:', company_id);

    // Notify employees about the new booking
    try {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
      const company = companies[0];

      // Get recipients
      const notifSettings = await base44.asServiceRole.entities.NotificationSetting.filter({ company_id });
      let recipients = [];

      if (notifSettings.length > 0) {
        recipients = notifSettings
          .filter(s => s.is_enabled !== false && s.events?.new_booking !== false && s.user_email)
          .map(s => ({ email: s.user_email, inApp: s.channels?.in_app !== false, sendEmail: s.channels?.email !== false }));
      } else {
        const allUsers = await base44.asServiceRole.entities.User.list();
        const registeredEmails = new Set(allUsers.map(u => u.email));
        const accesses = await base44.asServiceRole.entities.UserCompanyAccess.filter({ company_id });
        const allEmails = new Set(accesses.filter(a => a.user_email && registeredEmails.has(a.user_email)).map(a => a.user_email));
        if (company?.created_by && registeredEmails.has(company.created_by)) allEmails.add(company.created_by);
        recipients = [...allEmails].map(email => ({ email, inApp: true, sendEmail: true }));
      }

      const customerName = `${first_name} ${last_name}`;
      const emailBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e293b;margin:0 0 16px;">New Service Booking</h2>
        <p style="color:#475569;">A new booking has been submitted for <strong>${company?.name || 'your company'}</strong>.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:0;color:#166534;font-weight:600;font-size:16px;">${customerName}</p>
          ${email ? `<p style="margin:6px 0 0;color:#16a34a;">✉️ ${email}</p>` : ""}
          ${phone ? `<p style="margin:4px 0 0;color:#16a34a;">📞 ${phone}</p>` : ""}
          ${address ? `<p style="margin:4px 0 0;color:#16a34a;">📍 ${address}</p>` : ""}
          <p style="margin:8px 0 0;color:#15803d;font-weight:500;">🔧 ${service_type}</p>
          ${preferred_date ? `<p style="margin:4px 0 0;color:#15803d;">📅 ${preferred_date}${preferred_time ? ' at ' + preferred_time : ''}</p>` : ""}
          ${notes ? `<p style="margin:8px 0 0;color:#6b7280;font-size:13px;">Notes: ${notes}</p>` : ""}
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Log in to your dashboard to review and schedule this booking.</p>
      </div>`;

      await Promise.all(recipients.map(async (r) => {
        if (r.inApp) {
          await base44.asServiceRole.entities.Notification.create({
            company_id,
            user_email: r.email,
            title: "New Service Booking",
            message: `${customerName} booked ${service_type}${preferred_date ? ' for ' + preferred_date : ''}.`,
            type: "new_booking",
            is_read: false,
            related_entity_type: "service_booking",
            related_entity_id: booking.id,
            channels_sent: ["in_app"],
          });
        }
        if (r.sendEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: r.email,
            subject: `New Booking: ${customerName} — ${company?.name}`,
            body: emailBody,
          });
          console.log(`Booking notification email sent to ${r.email}`);
        }
      }));

      console.log(`Notified ${recipients.length} employee(s) about booking ${booking.id}`);
    } catch (notifError) {
      console.error('Notification error (non-fatal):', notifError.message);
    }

    return Response.json({ success: true, booking });
  } catch (error) {
    console.error('submitBooking error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});