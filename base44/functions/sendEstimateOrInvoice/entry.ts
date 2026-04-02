import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Central mail resolver (inlined — no local imports in Deno functions)
async function resolveMailSettings(base44, companyId) {
  const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
  const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';
  if (!companyId) return { error: 'No company_id', blocked: true };
  const settings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: companyId });
  const cfg = settings[0];
  if (!cfg || !cfg.mail_enabled) return { error: `Email not configured for company ${companyId}`, blocked: true };
  if (cfg.mail_method === 'smtp') {
    if (!cfg.smtp_host || !cfg.smtp_username) return { error: 'SMTP not fully configured', blocked: true };
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, method: 'smtp', enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_domain_verified) {
    return { from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`, replyTo: cfg.mail_reply_to || cfg.mail_from_address, method: 'resend', enabled: true, fallbackUsed: false };
  }
  if (cfg.mail_fallback_allowed) {
    console.warn(`[MailResolver] Company ${companyId} using platform fallback`);
    return { from: PLATFORM_FROM, replyTo: PLATFORM_REPLY_TO, method: 'resend', enabled: true, fallbackUsed: true };
  }
  return { error: `Domain not verified and fallback not allowed for company ${companyId}`, blocked: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { estimate_id, invoice_id, customer_id, contact_method, company_id } = await req.json();
    const docType = estimate_id ? 'estimate' : 'invoice';
    const docId = estimate_id || invoice_id;

    if (!customer_id || !docId) return Response.json({ error: 'customer_id and document_id required' }, { status: 400 });
    if (contact_method !== 'email') return Response.json({ error: 'Only email is currently supported' }, { status: 400 });

    const customers = await base44.asServiceRole.entities.Customer.filter({ id: customer_id });
    if (!customers.length) return Response.json({ error: 'Customer not found' }, { status: 404 });
    const customer = customers[0];
    if (!customer.email) return Response.json({ error: 'Customer has no email address' }, { status: 400 });

    let document = null;
    let company = null;

    if (estimate_id) {
      const estimates = await base44.asServiceRole.entities.Estimate.filter({ id: estimate_id });
      document = estimates[0];
    } else {
      const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
      document = invoices[0];
    }
    if (!document) return Response.json({ error: `${docType} not found` }, { status: 404 });

    const resolvedCompanyId = company_id || document.company_id;
    if (document.company_id) {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: document.company_id });
      company = companies[0];
    }

    // Resolve mail settings
    const mailSettings = await resolveMailSettings(base44, resolvedCompanyId);
    if (mailSettings.blocked) {
      console.error(`[sendEstimateOrInvoice] Blocked: ${mailSettings.error}`);
      return Response.json({ error: mailSettings.error }, { status: 400 });
    }

    let template = null;
    try {
      const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ company_id: resolvedCompanyId, template_type: docType });
      template = templates[0];
    } catch (e) {}

    const appDomain = req.headers.get('host') || 'app.base44.com';
    const baseUrl = `https://${appDomain.replace(/:\d+$/, '')}`;
    const primaryColor = template?.header_color || company?.primary_color || '#1a56db';
    const companyName = template?.company_name || company?.name || 'Our Company';
    const logoUrl = template?.logo_url || company?.logo_url;
    const showLogo = template?.show_logo !== false;
    const footerText = template?.footer_text;
    const companyPhone = template?.company_phone || company?.phone;
    const companyEmail = template?.company_email || company?.email;
    const docLabel = docType === 'estimate' ? 'Estimate' : 'Invoice';
    const docNumber = document.estimate_number || document.invoice_number || '';
    const subject = docType === 'estimate'
      ? `Your Estimate from ${companyName}${docNumber ? ' — ' + docNumber : ''}`
      : `Invoice from ${companyName}${docNumber ? ' — ' + docNumber : ''}`;
    const introText = docType === 'estimate'
      ? `Thank you for your interest! Please review the estimate options below and let us know which one you'd like to move forward with.`
      : `Please find your invoice details below. We appreciate your business and look forward to working with you.`;

    const estimateOptions = (docType === 'estimate' && document.options?.length > 0) ? document.options : null;

    function buildLineItemsHtml(lineItems) {
      return (lineItems || []).map(item => `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">${item.description || 'Item'}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;text-align:center;">${item.quantity || 1}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;text-align:right;">$${(item.unit_price || 0).toFixed(2)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;text-align:right;">$${(item.total || 0).toFixed(2)}</td>
        </tr>
      `).join('');
    }

    function buildOptionBlock(option, index, color) {
      const items = option.line_items || [];
      const subtotal = option.subtotal || 0;
      const taxAmount = option.tax_amount || 0;
      const taxRate = option.tax_rate || 0;
      const discount = option.discount || 0;
      const total = option.total || 0;
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr><td style="padding-bottom:12px;"><span style="font-size:16px;font-weight:700;color:#111827;">Option ${index + 1}: ${option.name || ''}</span>${option.notes ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">${option.notes}</p>` : ''}</td></tr>
          <tr><td><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <thead><tr style="background-color:${color};">
              <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;">Description</th>
              <th style="padding:12px 16px;text-align:center;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;">Qty</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;">Unit Price</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;">Total</th>
            </tr></thead>
            <tbody>${buildLineItemsHtml(items) || `<tr><td colspan="4" style="padding:20px 16px;text-align:center;color:#9ca3af;">No items</td></tr>`}</tbody>
          </table></td></tr>
          <tr><td><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr><td width="50%"></td><td width="50%">
            <table width="100%" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
              <tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;">Subtotal</td><td style="padding:10px 16px;font-size:13px;color:#374151;text-align:right;">$${subtotal.toFixed(2)}</td></tr>
              ${taxAmount > 0 ? `<tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Tax (${taxRate}%)</td><td style="padding:10px 16px;font-size:13px;color:#374151;text-align:right;border-top:1px solid #e5e7eb;">$${taxAmount.toFixed(2)}</td></tr>` : ''}
              ${discount > 0 ? `<tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Discount</td><td style="padding:10px 16px;font-size:13px;color:#059669;text-align:right;border-top:1px solid #e5e7eb;">-$${discount.toFixed(2)}</td></tr>` : ''}
              <tr style="background-color:${color};"><td style="padding:12px 16px;font-size:14px;font-weight:700;color:#ffffff;">Total</td><td style="padding:12px 16px;font-size:16px;font-weight:800;color:#ffffff;text-align:right;">$${total.toFixed(2)}</td></tr>
            </table>
          </td></tr></table></td></tr>
        </table>`;
    }

    const amount = document.total || 0;
    const subtotal = document.subtotal || 0;
    const taxAmount = document.tax_amount || 0;
    const taxRate = document.tax_rate || 0;
    const discount = document.discount || 0;
    const lineItems = document.line_items || [];
    const lineItemsHtml = buildLineItemsHtml(lineItems);
    const portalLink = docType === 'estimate'
      ? `${baseUrl}/CustomerPortal?estimate_id=${document.id}`
      : `${baseUrl}/CustomerPortal?invoice_id=${document.id}`;
    const ctaLabel = docType === 'estimate' ? 'View Estimate' : 'View Invoice &amp; Pay';

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr><td style="background-color:${primaryColor};padding:40px 40px 36px;text-align:center;">
        ${showLogo && logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:56px;width:auto;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;">` : ''}
        <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:6px;padding:6px 14px;margin-bottom:16px;"><span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1.5px;">${docLabel}</span></div>
        <div style="font-size:30px;font-weight:800;color:#ffffff;line-height:1.2;margin:0;">${companyName}</div>
        ${docNumber ? `<div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:8px;font-weight:500;">#${docNumber}</div>` : ''}
      </td></tr>
      <tr><td style="padding:40px 40px 0;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hi ${customer.first_name || 'there'},</p>
        <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.7;">${introText}</p>
        ${estimateOptions
          ? estimateOptions.map((opt, i) => buildOptionBlock(opt, i, primaryColor)).join('<hr style="border:none;border-top:2px dashed #e5e7eb;margin:16px 0;">')
          : `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
              <thead><tr style="background-color:${primaryColor};">
                <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;">Description</th>
                <th style="padding:12px 16px;text-align:center;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;">Qty</th>
                <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;">Unit Price</th>
                <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;">Total</th>
              </tr></thead>
              <tbody>${lineItemsHtml || `<tr><td colspan="4" style="padding:20px 16px;text-align:center;color:#9ca3af;">No items</td></tr>`}</tbody>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td width="50%"></td><td width="50%">
              <table width="100%" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                <tr><td style="padding:12px 16px;font-size:14px;color:#6b7280;">Subtotal</td><td style="padding:12px 16px;font-size:14px;color:#374151;font-weight:500;text-align:right;">$${subtotal.toFixed(2)}</td></tr>
                ${taxAmount > 0 ? `<tr><td style="padding:12px 16px;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">Tax (${taxRate}%)</td><td style="padding:12px 16px;font-size:14px;color:#374151;font-weight:500;text-align:right;border-top:1px solid #e5e7eb;">$${taxAmount.toFixed(2)}</td></tr>` : ''}
                ${discount > 0 ? `<tr><td style="padding:12px 16px;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">Discount</td><td style="padding:12px 16px;font-size:14px;color:#059669;font-weight:500;text-align:right;border-top:1px solid #e5e7eb;">-$${discount.toFixed(2)}</td></tr>` : ''}
                <tr style="background-color:${primaryColor};"><td style="padding:14px 16px;font-size:15px;font-weight:700;color:#ffffff;">Total</td><td style="padding:14px 16px;font-size:18px;font-weight:800;color:#ffffff;text-align:right;">$${amount.toFixed(2)}</td></tr>
              </table>
            </td></tr></table>`
        }
        ${document.notes ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;"><p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;">Notes</p><p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">${document.notes}</p></td></tr></table>` : ''}
        ${docType === 'invoice' ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;margin-bottom:8px;"><tr><td align="center"><a href="${portalLink}" style="display:inline-block;background-color:${primaryColor};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:8px;">${ctaLabel}</a></td></tr><tr><td align="center" style="padding-top:12px;"><p style="margin:0;font-size:12px;color:#9ca3af;">Or copy this link: <a href="${portalLink}" style="color:${primaryColor};word-break:break-all;">${portalLink}</a></p></td></tr></table>` : ''}
      </td></tr>
      ${companyPhone || companyEmail ? `<tr><td style="padding:32px 40px 0;"><table width="100%" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;"><tr><td style="padding:20px 24px;"><p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;">Questions? Contact Us</p><table cellpadding="0" cellspacing="0">${companyPhone ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">&#128222;&nbsp;&nbsp;<a href="tel:${companyPhone}" style="color:${primaryColor};font-weight:600;text-decoration:none;">${companyPhone}</a></td></tr>` : ''}${companyEmail ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">&#9993;&nbsp;&nbsp;<a href="mailto:${companyEmail}" style="color:${primaryColor};font-weight:600;text-decoration:none;">${companyEmail}</a></td></tr>` : ''}</table></td></tr></table></td></tr>` : ''}
      <tr><td style="padding:32px 40px;text-align:center;border-top:1px solid #e5e7eb;margin-top:32px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#374151;">${companyName}</p>
        ${footerText ? `<p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">${footerText}</p>` : ''}
        <p style="margin:0;font-size:12px;color:#d1d5db;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    await resend.emails.send({
      from: mailSettings.from,
      reply_to: mailSettings.replyTo,
      to: customer.email,
      subject,
      html,
    });

    console.log(`[sendEstimateOrInvoice] ${docType} sent to ${customer.email} from ${mailSettings.from} (fallback: ${mailSettings.fallbackUsed})`);
    return Response.json({ success: true, message: `${docType} sent successfully` });
  } catch (error) {
    console.error('Error in sendEstimateOrInvoice:', error.message);
    return Response.json({ error: error.message || 'Failed to send' }, { status: 500 });
  }
});