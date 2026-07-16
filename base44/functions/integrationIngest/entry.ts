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

    // Normalize Thumbtack's nested payload into a flat lead record.
    // Thumbtack sends { event: { eventType, data: { customer, request } } }
    let firstName = '', lastName = '', email = '', phone = '';
    let address = '', serviceInterest = '', source = 'other', notesPrefix = '';

    const isThumbtack = provider === 'thumbtack' || (body.event && body.event.eventType);

    if (isThumbtack) {
      const evt = body.event || {};
      const data = evt.data || {};
      const customer = data.customer || {};
      const request = data.request || {};
      const location = request.location || {};
      const category = request.category || {};

      firstName = customer.firstName || '';
      lastName = customer.lastName || '';
      phone = customer.phone || '';
      email = customer.email || '';
      const addressLine = [location.address1, location.address2].filter(Boolean).join(', ');
      address = [addressLine, location.city, location.state, location.zipcode].filter(Boolean).join(', ');

      const parts = [];
      if (evt.eventType) parts.push('Thumbtack event: ' + evt.eventType);
      if (category.name) parts.push('Category: ' + category.name);
      if (request.description) parts.push('Request: ' + request.description);
      const details = (request.details || []).map(d => (d.question ? d.question + ': ' : '') + (d.answer || '')).join('; ');
      if (details) parts.push('Details: ' + details);
      const times = (request.proposedTimes || []).map(t => t.start).filter(Boolean).join(', ');
      if (times) parts.push('Proposed times: ' + times);
      parts.push('Thumbtack customer ID: ' + (customer.customerID || ''));
      parts.push('Request ID: ' + (request.requestID || ''));
      parts.push('Negotiation ID: ' + (data.negotiationID || ''));
      notesPrefix = parts.filter(Boolean).join('\n');
      serviceInterest = category.name || request.description || 'Thumbtack lead';
      source = 'other';
    } else {
      // Generic best-effort mapping of common flat lead fields.
      const rawName = body.name || body.full_name || [body.first_name, body.last_name].filter(Boolean).join(' ') || '';
      firstName = body.first_name || (rawName ? rawName.split(' ')[0] : '');
      lastName = body.last_name || (rawName ? rawName.split(' ').slice(1).join(' ') : '');
      email = body.email || body.email_address || '';
      phone = body.phone || body.phone_number || body.mobile || '';
      address = body.address || body.street || body.location || '';
      serviceInterest = body.service_interest || body.service_request || body.category || body.service_type || provider;
      source = 'other';
      notesPrefix = 'Inbound lead via ' + provider + ' webhook';
    }

    const leadData = {
      company_id: companyId,
      first_name: firstName || 'Unknown',
      last_name: lastName || '',
      email,
      phone,
      address,
      source,
      service_interest: serviceInterest || provider,
      status: 'new',
      notes: notesPrefix + '\n\nRaw payload:\n' + JSON.stringify(body).slice(0, 3000)
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