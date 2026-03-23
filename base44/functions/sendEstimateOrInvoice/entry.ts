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
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e293b;margin:0 0 8px;">New ${docType.charAt(0).toUpperCase() + docType.slice(1)}</h2>
      <p style="color:#475569;">Hi ${customer.first_name || 'there'},</p>
      <p style="color:#475569;">Please review the attached ${docType}.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
        <div style="font-size:28px;font-weight:700;color:#1e293b;">$${amount.toFixed(2)}</div>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Questions? Contact ${company?.email || company?.phone || 'support'}.</p>
    </div>`;

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