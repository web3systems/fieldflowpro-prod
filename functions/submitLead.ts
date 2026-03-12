import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { company_id, first_name, last_name, email, phone, address, service_interest, notes } = body;

    if (!company_id || !first_name || !last_name) {
      return Response.json({ error: 'Missing required fields: company_id, first_name, last_name' }, { status: 400 });
    }

    const lead = await base44.asServiceRole.entities.Lead.create({
      company_id,
      first_name,
      last_name,
      email: email || "",
      phone: phone || "",
      address: address || "",
      service_interest: service_interest || "",
      notes: notes || "",
      source: "website",
      status: "new",
    });

    console.log('Lead created:', lead.id, 'for company:', company_id);
    return Response.json({ success: true, lead });
  } catch (error) {
    console.error('submitLead error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});