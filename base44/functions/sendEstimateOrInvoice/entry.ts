import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { estimate_id, invoice_id, customer_id, contact_method, company_id } = await req.json();
    const docType = estimate_id ? 'estimate' : 'invoice';
    const docId = estimate_id || invoice_id;

    if (!customer_id || !docId) {
      return Response.json({ error: 'customer_id and document_id required' }, { status: 400 });
    }

    if (contact_method !== 'email') {
      return Response.json({ error: 'Only email is currently supported' }, { status: 400 });
    }

    // Get customer
    const customers = await base44.asServiceRole.entities.Customer.filter({ id: customer_id });
    if (!customers.length) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customers[0];
    if (!customer.email) {
      return Response.json({ error: 'Customer has no email address' }, { status: 400 });
    }

    // Get the document (estimate or invoice)
    let document = null;
    let company = null;
    
    if (estimate_id) {
      const estimates = await base44.asServiceRole.entities.Estimate.filter({ id: estimate_id });
      document = estimates[0];
    } else {
      const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
      document = invoices[0];
    }

    if (!document) {
      return Response.json({ error: `${docType} not found` }, { status: 404 });
    }

    // Get company for email signature
    if (document.company_id) {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: document.company_id });
      company = companies[0];
    }

    const subject = `Your ${docType.charAt(0).toUpperCase() + docType.slice(1)}`;
    const amount = document.total || 0;
    const subtotal = document.subtotal || 0;
    const taxAmount = document.tax_amount || 0;
    const discount = document.discount || 0;
    
    // Get the app domain from request
    const appDomain = req.headers.get('host') || 'fieldflowpro.com';
    const protocol = req.url.startsWith('https') ? 'https' : 'https';
    const baseUrl = `${protocol}://${appDomain}`;
    
    // Get company email template
    let template = null;
    try {
      const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
        company_id: company_id,
        template_type: docType
      });
      template = templates[0];
    } catch (e) {
      // Template not found, use defaults
    }

    // Get branding from template or company
    const primaryColor = template?.header_color || company?.primary_color || '#FFC107';
    const accentColor = template?.accent_color || '#2C3E50';
    const logoUrl = template?.logo_url || company?.logo_url;
    const showLogo = template?.show_logo !== false;
    const footerText = template?.footer_text;
    
    const lineItemsHtml = (document.line_items || document.options?.[0]?.line_items || []).map(item => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:left;color:#1e293b;">${item.description || 'Item'}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#1e293b;">${item.quantity || 1}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b;">$${(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b;font-weight:600;">$${(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f0f4f8; }
    .container { max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); padding: 40px 24px; text-align: center; position: relative; }
    .header::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.03); }
    .header-inner { position: relative; z-index: 1; }
    .logo { margin: 0 0 25px; }
    .logo img { max-height: 60px; width: auto; }
    .header-title { font-size: 36px; font-weight: 800; color: white; margin: 0; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header-subtitle { font-size: 14px; color: rgba(255,255,255,0.95); margin: 8px 0 0; font-weight: 500; }
    .content { padding: 40px 24px; }
    .greeting { font-size: 18px; font-weight: 600; color: #2C3E50; margin: 0 0 12px; }
    .intro-text { font-size: 14px; color: #555; margin: 0 0 20px; line-height: 1.6; }
    .document-number { font-size: 12px; color: ${primaryColor}; font-weight: 600; margin: 0 0 30px; text-transform: uppercase; letter-spacing: 1px; }
    .table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    .table-header { background: ${primaryColor}; }
    .table-header th { padding: 14px 12px; text-align: left; font-weight: 700; color: white; font-size: 12px; text-transform: uppercase; border: none; }
    .table tbody tr { border-bottom: 1px solid #e8ecf1; }
    .table tbody tr:hover { background: #f8fafb; }
    .table td { padding: 14px 12px; font-size: 13px; color: #2C3E50; }
    .summary { margin: 30px 0; padding: 24px; background: linear-gradient(135deg, #f8fafb 0%, #f0f4f8 100%); border-radius: 8px; border-left: 4px solid ${primaryColor}; }
    .summary-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; color: #555; }
    .summary-row.total { border-top: 2px solid ${primaryColor}; padding-top: 16px; margin-top: 16px; font-weight: 700; font-size: 18px; color: #2C3E50; }
    .total-amount { color: ${primaryColor}; }
    .action-buttons { text-align: center; margin: 35px 0; }
    .action-buttons p { color: #2C3E50; font-size: 14px; font-weight: 600; margin: 0 0 20px; }
    .btn-approve { display: inline-block; background: #27AE60; color: white; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 12px; font-size: 13px; transition: background 0.2s; }
    .btn-approve:hover { background: #229954; }
    .btn-decline { display: inline-block; background: #E74C3C; color: white; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; transition: background 0.2s; }
    .btn-decline:hover { background: #C0392B; }
    .notes-box { padding: 20px; background: #FFF9E6; border-radius: 6px; border-left: 4px solid ${primaryColor}; margin: 30px 0; }
    .notes-box p { margin: 0; font-size: 13px; color: #7D5E0F; }
    .footer { padding: 30px 24px; background: #2C3E50; border-top: 4px solid ${primaryColor}; font-size: 12px; color: #BDC3C7; text-align: center; }
    .footer p { margin: 0; }
    .divider { height: 1px; background: #e8ecf1; margin: 30px 0; }
    .contact-info { font-size: 13px; color: #2C3E50; margin: 20px 0 0 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-inner">
        ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="${company?.name}"></div>` : ''}
        <div class="header-title">${docType.charAt(0).toUpperCase() + docType.slice(1)}</div>
        <div class="header-subtitle">${docType === 'estimate' ? 'We\'ve prepared an estimate for your project' : 'Payment due on ' + (document.due_date ? new Date(document.due_date).toLocaleDateString() : 'receipt')}</div>
      </div>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${customer.first_name || 'there'},</p>
      <p class="intro-text">Thank you for reaching out! We've put together a detailed estimate for your project. Review the details below and let us know what you think.</p>
      ${document.estimate_number ? `<p class="document-number">Estimate #${document.estimate_number}</p>` : ''}
      
      <table class="table">
        <thead class="table-header">
          <tr>
            <th>Description</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>
      
      <div class="summary">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        ${taxAmount > 0 ? `<div class="summary-row">
          <span>Tax (${((document.tax_rate || 0) * 100).toFixed(1)}%)</span>
          <span>$${taxAmount.toFixed(2)}</span>
        </div>` : ''}
        ${discount > 0 ? `<div class="summary-row">
          <span>Discount</span>
          <span>-$${discount.toFixed(2)}</span>
        </div>` : ''}
        <div class="summary-row total">
          <span>Total</span>
          <span class="total-amount">$${amount.toFixed(2)}</span>
        </div>
      </div>
      
      ${document.notes ? `<div class="notes-box">
        <p><strong>📝 Notes:</strong> ${document.notes}</p>
      </div>` : ''}
      
      ${docType === 'estimate' ? `<div class="action-buttons">
        <p>Ready to move forward?</p>
        <a href="https://honeydocrew.co/api/functions/approveEstimate?estimate_id=${document.id}&customer_id=${customer_id}" class="btn-approve">✓ Approve This Estimate</a>
        <a href="https://honeydocrew.co/api/functions/rejectEstimate?estimate_id=${document.id}&customer_id=${customer_id}" class="btn-decline">✗ Not Interested</a>
      </div>` : ''}
      
      <div class="divider"></div>
      
      <p style="color:#555;font-size:13px;margin:0 0 12px;">Have questions? We're here to help!</p>
      <div class="contact-info">
        ${company?.phone ? `<div style="margin-bottom:6px;">📞 <strong>${company.phone}</strong></div>` : ''}
        ${company?.email ? `<div>📧 <strong>${company.email}</strong></div>` : ''}
      </div>
    </div>
    
    <div class="footer">
      <p style="margin-bottom:8px;"><strong>${company?.name || 'HoneyDo Crew'}</strong></p>
      <p>© ${new Date().getFullYear()} ${company?.name || 'HoneyDo Crew'}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    // Send email via Resend REST API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${company?.name || 'FieldFlow'} <noreply@honeydocrew.co>`,
        to: customer.email,
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();
    console.log(`${docType} email sent to ${customer.email}`, emailData.id);
    return Response.json({ success: true, message: `${docType} sent successfully` });
  } catch (error) {
    console.error('Error in sendEstimateOrInvoice:', error.message);
    return Response.json({ error: error.message || 'Failed to send' }, { status: 500 });
  }
});