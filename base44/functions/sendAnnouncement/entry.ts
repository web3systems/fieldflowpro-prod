import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subject, message, company_ids } = await req.json();

    if (!subject || !message || !company_ids?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const allCustomers = await base44.asServiceRole.entities.Customer.list();
    const targets = allCustomers.filter(c => company_ids.includes(c.company_id) && c.email);

    let sent = 0;
    const skipped = allCustomers.filter(c => company_ids.includes(c.company_id) && !c.email).length;

    for (const customer of targets) {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Valued Customer';
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customer.email,
          subject,
          body: `<p>Hi ${name},</p><br/>${message.replace(/\n/g, '<br/>')}`,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${customer.email}:`, err.message);
      }
    }

    return Response.json({ sent, skipped });
  } catch (error) {
    console.error('sendAnnouncement error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});