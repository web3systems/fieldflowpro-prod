import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@4.0.0';

// Central mail resolver (inlined — no local imports in Deno functions)
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

    const { invoice_id, portal_url } = await req.json();
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    const invoice = invoices[0];
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    // Verify user has access to this invoice's company
    if (user.role !== 'admin' && user.role !== 'super_admin') {
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

    // SUPER-ADMIN REVIEW QUEUE:
    // Non-super-admin users never send directly to the customer; the request is
    // silently enqueued for super-admin review while the UI reports success.
    if (user.role !== 'super_admin') {
      const customerName = customer.business_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      await base44.asServiceRole.entities.MessageQueue.create({
        company_id: invoice.company_id,
        doc_type: 'invoice',
        doc_id: invoice_id,
        doc_number: invoice.invoice_number || '',
        doc_title: invoice.invoice_number || 'Invoice',
        customer_id: customer.id,
        customer_name: customerName,
        contact_method: 'email',
        to_email: customer.email || '',
        status: 'pending',
        requested_by_id: user.id,
        requested_by_name: user.full_name || user.email || '',
        requested_at: new Date().toISOString(),
      });
      console.log(`[sendInvoiceEmail] QUEUED invoice ${invoice_id} for review (user ${user.email}, role ${user.role})`);
      // Auto-advance draft invoices to "sent" so it looks like a normal send to the requester
      if (invoice.status === 'draft') {
        await base44.asServiceRole.entities.Invoice.update(invoice_id, { status: 'sent' });
      }
      return Response.json({ success: true, queued: true });
    }

    // Resolve mail settings via standard resolver
    const mailSettings = await resolveMailSettings(base44, invoice.company_id);
    if (mailSettings.blocked) {
      console.error(`[sendInvoiceEmail] Blocked: ${mailSettings.error}`);
      return Response.json({ error: mailSettings.error }, { status: 400 });
    }

    const companyName = company?.name || 'FieldFlow Pro';
    const primaryColor = company?.primary_color || '#2563eb';

    const lineItemsHtml = (invoice.line_items || []).length > 0 ? `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f1f5f9;">
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#64748b;text-transform:uppercase;">Description</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;color:#64748b;text-transform:uppercase;">Amount</th>
        </tr>
        ${(invoice.line_items || []).map(item => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px 12px;color:#334155;">${item.description || ''}</td>
            <td style="padding:8px 12px;color:#334155;text-align:right;">$${(item.total || 0).toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>` : '';

    await resend.emails.send({
      from: mailSettings.from,
      reply_to: mailSettings.replyTo,
      to: customer.email,
      subject: `Invoice ${invoice.invoice_number} from ${companyName}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e293b;margin:0 0 8px;">Invoice ${invoice.invoice_number}</h2>
        <p style="color:#475569;">Hi ${customer.first_name || 'there'},</p>
        <p style="color:#475569;">You have a new invoice from <strong>${companyName}</strong>.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
          <div style="font-size:28px;font-weight:700;color:#1e293b;">$${(invoice.total || 0).toFixed(2)}</div>
          ${invoice.due_date ? `<div style="color:#64748b;margin-top:4px;">Due ${new Date(invoice.due_date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>` : ''}
        </div>
        ${lineItemsHtml}
        ${portal_url ? `<div style="text-align:center;margin:24px 0;"><a href="${portal_url}" style="display:inline-block;background:${primaryColor};color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View &amp; Pay Invoice →</a></div>` : ''}
        ${invoice.notes ? `<p style="color:#64748b;font-size:14px;background:#f8fafc;padding:12px;border-radius:6px;border-left:3px solid #e2e8f0;">${invoice.notes}</p>` : ''}
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Questions? Contact ${company?.email || company?.phone || 'us'}.</p>
      </div>`
    });

    // Auto-advance draft invoices to "sent"
    if (invoice.status === 'draft') {
      await base44.asServiceRole.entities.Invoice.update(invoice_id, { status: 'sent' });
    }

    console.log(`[sendInvoiceEmail] Sent to ${customer.email} for invoice ${invoice_id} from ${mailSettings.from} (fallback: ${mailSettings.fallbackUsed})`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending invoice email:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});