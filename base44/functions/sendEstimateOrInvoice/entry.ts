import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { estimate_id, invoice_id, customer_id, contact_method } = await req.json();
    const docId = estimate_id || invoice_id;
    const docType = estimate_id ? 'estimate' : 'invoice';

    // Get customer contact info
    const customers = await base44.asServiceRole.entities.Customer.filter({ id: customer_id });
    if (!customers.length) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customers[0];

    if (contact_method === 'email') {
      if (!customer.email) {
        return Response.json({ error: 'Customer has no email address' }, { status: 400 });
      }

      // Send email
      const subject = `Your ${docType.charAt(0).toUpperCase() + docType.slice(1)} - Action Required`;
      const body = `Hi ${customer.first_name},\n\nPlease review the attached ${docType}.\n\nThank you!`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: customer.email,
        subject,
        body,
      });

      return Response.json({ success: true, message: `${docType} sent via email` });
    } else if (contact_method === 'sms') {
      if (!customer.phone) {
        return Response.json({ error: 'Customer has no phone number' }, { status: 400 });
      }

      // SMS support would go here - for now, we return a message
      // In a real scenario, you'd integrate with Twilio or similar
      return Response.json({ success: true, message: `SMS capability coming soon. Phone: ${customer.phone}` });
    }

    return Response.json({ error: 'Invalid contact method' }, { status: 400 });
  } catch (error) {
    console.error('Error sending:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});