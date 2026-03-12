import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    // Only fire when status changes to "scheduled"
    if (!data || data.status !== "scheduled") return Response.json({ skipped: true });
    if (old_data?.status === "scheduled") return Response.json({ skipped: true });
    if (!data.scheduled_start) return Response.json({ skipped: true });

    const customers = await base44.asServiceRole.entities.Customer.filter({ id: data.customer_id });
    const customer = customers[0];
    if (!customer?.email) return Response.json({ skipped: true, reason: "no customer email" });

    const companies = await base44.asServiceRole.entities.Company.filter({ id: data.company_id });
    const company = companies[0];

    const dateStr = new Date(data.scheduled_start).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = new Date(data.scheduled_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: customer.email,
      subject: `Appointment Confirmed — ${dateStr}`,
      body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
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

    console.log(`Job scheduled email sent to ${customer.email} for job ${event.entity_id}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error sending job scheduled email:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});