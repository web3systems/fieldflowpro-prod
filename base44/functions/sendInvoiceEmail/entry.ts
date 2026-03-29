import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoice_id, portal_url } = await req.json();
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    const invoice = invoices[0];
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    // Verify user has access to this invoice's company
    if (user.role !== 'admin') {
      const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({
        user_email: user.email,
        company_id: invoice.company_id
      });
      if (access.length === 0) return Response.json({ error: 'Forbidden: No access to this company' }, { status: 403 });
    }

    const customers = await base44.asServiceRole.entities.Customer.filter({ id: invoice.customer_id });
    const customer = customers[0];
    if (!customer?.email) return Response.json({ error: 'Customer has no email' }, { status: 400 });

    const companies = await base44.asServiceRole.entities.Company.filter({ id: invoice.company_id });
    const company = companies[0];

    const lineItemsHtml = (invoice.line_items || []).length > 0 ? `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f1f5f9;">
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#64748b;text-transform:uppercase;">Description</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;color:#64748b;text-transform:uppercase;">Amount</th>
        </tr>
        ${(invoice.line_items || []).map(item => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px 12px;color:#334155;">${item.description || ""}</td>
            <td style="padding:8px 12px;color:#334155;text-align:right;">$${(item.total || 0).toFixed(2)}</td>
          </tr>
        `).join("")}
      </table>` : "";

    const companyName = company?.name || "Your Service Provider";
    const VERIFIED_DOMAINS = ['honeydocrew.co', 'honeydoclean.com', 'prettylittlepolishers.com'];
    const companyDomain = company?.email ? company.email.split('@')[1] : null;
    const fromDomain = (companyDomain && VERIFIED_DOMAINS.includes(companyDomain)) ? companyDomain : 'honeydocrew.co';
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@${fromDomain}>`,
        to: customer.email,
        subject: `Invoice ${invoice.invoice_number} from ${companyName}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e293b;margin:0 0 8px;">Invoice ${invoice.invoice_number}</h2>
          <p style="color:#475569;">Hi ${customer.first_name},</p>
          <p style="color:#475569;">You have a new invoice from <strong>${companyName}</strong>.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
            <div style="font-size:28px;font-weight:700;color:#1e293b;">$${(invoice.total || 0).toFixed(2)}</div>
            ${invoice.due_date ? `<div style="color:#64748b;margin-top:4px;">Due ${new Date(invoice.due_date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>` : ""}
          </div>
          ${lineItemsHtml}
          ${portal_url ? `<div style="text-align:center;margin:24px 0;"><a href="${portal_url}" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View &amp; Pay Invoice →</a></div>` : ""}
          ${invoice.notes ? `<p style="color:#64748b;font-size:14px;background:#f8fafc;padding:12px;border-radius:6px;border-left:3px solid #e2e8f0;">${invoice.notes}</p>` : ""}
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Questions? Contact ${company?.email || company?.phone || "us"}.</p>
        </div>`
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend API error:', errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    // Auto-advance draft invoices to "sent"
    if (invoice.status === "draft") {
      await base44.asServiceRole.entities.Invoice.update(invoice_id, { status: "sent" });
    }

    console.log(`Invoice email sent to ${customer.email} for invoice ${invoice_id}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error sending invoice email:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});