import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { company_id, first_name, last_name, email, phone, address, service_type, preferred_date, preferred_time, notes, customer_id } = body;

    if (!company_id || !first_name || !last_name || !service_type) {
      return Response.json({ error: 'Missing required fields: company_id, first_name, last_name, service_type' }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.ServiceBooking.create({
      company_id,
      customer_id: customer_id || "",
      first_name,
      last_name,
      email: email || "",
      phone: phone || "",
      address: address || "",
      service_type,
      preferred_date: preferred_date || "",
      preferred_time: preferred_time || "",
      notes: notes || "",
      status: 'pending',
    });

    console.log('Booking created:', booking.id, 'for company:', company_id);
    return Response.json({ success: true, booking });
  } catch (error) {
    console.error('submitBooking error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});