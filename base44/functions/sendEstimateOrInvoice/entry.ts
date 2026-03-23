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

    if (!customer_id) {
      return Response.json({ error: 'customer_id required' }, { status: 400 });
    }

    // Get customer - filter by ID and company if provided
    let customerFilter = { id: customer_id };
    if (company_id) {
      customerFilter.company_id = company_id;
    }
    
    const customers = await base44.asServiceRole.entities.Customer.filter(customerFilter);
    if (!customers.length) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customers[0];

    if (contact_method === 'email') {
      if (!customer.email) {
        return Response.json({ error: 'Customer has no email address' }, { status: 400 });
      }

      const subject = `Your ${docType.charAt(0).toUpperCase() + docType.slice(1)}`;
      const body = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <p>Hi ${customer.first_name},</p>
        <p>Please review the attached ${docType}.</p>
        <p>Thank you!</p>
      </div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: customer.email,
        subject,
        body,
      });

      return Response.json({ success: true });
    } else if (contact_method === 'sms') {
      if (!customer.phone) {
        return Response.json({ error: 'Customer has no phone number' }, { status: 400 });
      }
      return Response.json({ success: true, message: 'SMS feature coming soon' });
    }

    return Response.json({ error: 'Invalid contact method' }, { status: 400 });
  } catch (error) {
    console.error('Error in sendEstimateOrInvoice:', error);
    return Response.json({ error: error.message || 'Failed to send' }, { status: 500 });
  }
});