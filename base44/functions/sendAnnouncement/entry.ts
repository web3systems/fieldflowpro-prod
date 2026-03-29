import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function getSenderForCompany(company) {
  const name = (company?.name || '').toLowerCase();
  const slug = (company?.slug || '').toLowerCase();
  if (name.includes('pretty little') || slug.includes('pretty')) {
    return `${company.name} <notifications@prettylittlepolishers.com>`;
  }
  if (name.includes('honeydo clean') || slug.includes('honeydoclean')) {
    return `${company.name} <notifications@honeydoclean.com>`;
  }
  return `${company?.name || 'Honeydo Crew'} <notifications@honeydocrew.co>`;
}

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

    // Pre-load all companies so we can get the right sender per company
    const allCompanies = await base44.asServiceRole.entities.Company.list();
    const companyMap = Object.fromEntries(allCompanies.map(c => [c.id, c]));

    const allCustomers = await base44.asServiceRole.entities.Customer.list();
    const targets = allCustomers.filter(c => company_ids.includes(c.company_id) && c.email);
    const skipped = allCustomers.filter(c => company_ids.includes(c.company_id) && !c.email).length;

    let sent = 0;
    for (const customer of targets) {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Valued Customer';
      const company = companyMap[customer.company_id];
      const fromAddress = getSenderForCompany(company);
      try {
        await resend.emails.send({
          from: fromAddress,
          to: customer.email,
          subject,
          html: `<p>Hi ${name},</p><br/>${message.replace(/\n/g, '<br/>')}`,
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