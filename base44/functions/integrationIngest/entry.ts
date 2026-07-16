import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);

    // Parse the body once. External systems may send JSON; we also accept
    // company/token as query params (preferred) or inside the JSON body.
    let body = {};
    const contentType = req.headers.get('content-type') || '';
    if (req.method === 'POST') {
      if (contentType.includes('application/json')) {
        try { body = await req.json(); } catch (e) { console.log('JSON parse failed', e.message); body = {}; }
      } else {
        try { body = await req.json(); } catch (_) { body = {}; }
      }
    }

    const companyId = url.searchParams.get('company') || body.company;
    const token = url.searchParams.get('token') || body.token;

    if (!companyId || !token) {
      return Response.json({ error: 'Missing company or token' }, { status: 400 });
    }

    // Look up an active incoming-webhook integration for this company.
    const integrations = await base44.asServiceRole.entities.Integration.filter({
      company_id: companyId,
      integration_type: 'incoming_webhook',
      is_active: true
    });

    const integration = integrations.find(i => i.secret && i.secret === token);
    if (!integration) {
      console.log('Ingest rejected: invalid token for company', companyId);
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove auth fields so they don't leak into the lead record.
    delete body.company;
    delete body.token;

    const provider = integration.provider || 'custom';

    // Best-effort generic mapping of common lead fields.
    const rawName = body.name || body.full_name || [body.first_name, body.last_name].filter(Boolean).join(' ') || '';
    const firstName = body.first_name || (rawName ? rawName.split(' ')[0] : '');
    const lastName = body.last_name || (rawName ? rawName.split(' ').slice(1).join(' ') : '');

    const leadData = {
      company_id: companyId,
      first_name: firstName || 'Unknown',
      last_name: lastName || '',
      email: body.email || body.email_address || '',
      phone: body.phone || body.phone_number || body.mobile || '',
      address: body.address || body.street || body.location || '',
      source: 'other',
      service_interest: body.service_interest || body.service_request || body.category || body.service_type || provider,
      status: 'new',
      notes: 'Inbound lead via ' + provider + ' webhook.\n\nRaw payload:\n' + JSON.stringify(body).slice(0, 1200)
    };

    const lead = await base44.asServiceRole.entities.Lead.create(leadData);

    await base44.asServiceRole.entities.Integration.update(integration.id, {
      last_event_at: new Date().toISOString(),
      last_error: ''
    });

    return Response.json({ ok: true, lead_id: lead.id, message: 'Lead created' });
  } catch (error) {
    console.error('integrationIngest error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});