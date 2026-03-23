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
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, ${company?.primary_color || '#1e293b'} 0%, ${company?.primary_color || '#1e293b'}dd 100%); padding: 40px 24px; text-align: center; }
    .logo { font-size: 24px; font-weight: 700; color: white; margin: 0 0 20px; }
    .header-title { font-size: 32px; font-weight: 700; color: white; margin: 0; }
    .content { padding: 40px 24px; }
    .greeting { font-size: 16px; color: #1e293b; margin: 0 0 20px; }
    .document-number { font-size: 13px; color: #94a3b8; margin: 0 0 30px; }
    .table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    .table-header { background: #f1f5f9; }
    .table-header th { padding: 12px; text-align: left; font-weight: 600; color: #475569; font-size: 13px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
    .summary { margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #475569; }
    .summary-row.total { border-top: 2px solid #e2e8f0; padding-top: 15px; margin-top: 15px; font-weight: 700; font-size: 16px; color: #1e293b; }
    .cta-button { display: inline-block; background: ${company?.primary_color || '#1e293b'}; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 30px 0; }
    .footer { padding: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
    .divider { height: 1px; background: #e2e8f0; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${company?.logo_url ? `<div class="logo"><img src="${company.logo_url}" style="max-height:40px;"></div>` : `<div class="logo">${company?.name || 'FieldFlow'}</div>`}
      <div class="header-title">${docType.charAt(0).toUpperCase() + docType.slice(1)}</div>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${customer.first_name || 'there'},</p>
      <p style="color:#475569;margin:0 0 20px;">Thank you for your business. Please find the details of your ${docType} below.</p>
      ${document.estimate_number ? `<p class="document-number">${docType.charAt(0).toUpperCase() + docType.slice(1)} #${document.estimate_number}</p>` : ''}
      
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
          <span>$${amount.toFixed(2)}</span>
        </div>
      </div>
      
      ${document.notes ? `<div style="padding:20px;background:#fff9e6;border-radius:6px;border-left:4px solid #fbbf24;margin:30px 0;">
        <p style="margin:0;font-size:13px;color:#92400e;"><strong>Notes:</strong> ${document.notes}</p>
      </div>` : ''}
      
      ${docType === 'estimate' ? `<div style="text-align:center;margin:30px 0;">
        <p style="color:#475569;font-size:14px;margin:0 0 15px;">What do you think?</p>
        <a href="https://honeydocrew.co/api/functions/approveEstimate?estimate_id=${document.id}&customer_id=${customer_id}" style="display:inline-block;background:#10b981;color:white;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;margin-right:10px;">✓ Approve</a>
        <a href="https://honeydocrew.co/api/functions/rejectEstimate?estimate_id=${document.id}&customer_id=${customer_id}" style="display:inline-block;background:#ef4444;color:white;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;">✗ Decline</a>
      </div>` : ''}
      
      <div class="divider"></div>
      
      <p style="color:#94a3b8;font-size:13px;margin:0;">Questions or need changes? Reply to this email or contact us:</p>
      <p style="color:#1e293b;font-size:14px;margin:10px 0 0 0;">
        ${company?.phone ? `📞 ${company.phone}<br>` : ''}
        ${company?.email ? `📧 ${company.email}` : ''}
      </p>
    </div>
    
    <div class="footer">
      <p style="margin:0;">© ${new Date().getFullYear()} ${company?.name || 'FieldFlow'}. All rights reserved.</p>
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