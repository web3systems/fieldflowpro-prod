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

    // Deep-search helpers: Thumbtack nests fields unpredictably (e.g. request
    // can live inside customer), so we scan the whole payload rather than hard
    // coding exact paths.
    function findObjectWith(obj, key, maxDepth = 6) {
      if (!obj || typeof obj !== 'object' || maxDepth < 0) return null;
      if (key in obj) return obj;
      for (const v of Object.values(obj)) {
        if (v && typeof v === 'object') {
          const found = findObjectWith(v, key, maxDepth - 1);
          if (found) return found;
        }
      }
      return null;
    }
    function pick(obj, ...keys) {
      for (const k of keys) if (obj && obj[k]) return obj[k];
      return '';
    }

    let firstName = '', lastName = '', email = '', phone = '';
    let address = '', serviceInterest = '', source = 'other', notesPrefix = '';

    const isThumbtack = provider === 'thumbtack' ||
      (body.event && body.event.eventType) ||
      !!findObjectWith(body, 'negotiationID');

    if (isThumbtack) {
      const evt = (body.event && typeof body.event === 'object' ? body.event : body) || {};
      const data = evt.data || evt;

      const customer = findObjectWith(data, 'firstName') || findObjectWith(data, 'first_name') || findObjectWith(data, 'customerID') || {};
      const request = findObjectWith(data, 'requestID') || findObjectWith(customer, 'requestID') || findObjectWith(data, 'description') || {};
      const location = findObjectWith(request, 'address1') || findObjectWith(request, 'city') || findObjectWith(data, 'zipcode') || {};
      const category = findObjectWith(request, 'categoryID') || (request.category && request.category.name ? request.category : {}) || {};

      firstName = pick(customer, 'firstName', 'first_name');
      lastName = pick(customer, 'lastName', 'last_name');
      phone = pick(customer, 'phone', 'phoneNumber', 'phone_number');
      email = pick(customer, 'email', 'email_address');
      const addressLine = [pick(location, 'address1', 'address', 'street'), pick(location, 'address2')].filter(Boolean).join(', ');
      address = [addressLine, pick(location, 'city'), pick(location, 'state'), pick(location, 'zipcode', 'zip', 'postalCode')].filter(Boolean).join(', ');

      const parts = [];
      if (evt.eventType) parts.push('Thumbtack event: ' + evt.eventType);
      if (category.name) parts.push('Category: ' + category.name);
      if (request.description) parts.push('Request: ' + request.description);
      const details = (request.details || []).map(d => (d.question ? d.question + ': ' : '') + (d.answer || '')).join('; ');
      if (details) parts.push('Details: ' + details);
      const times = (request.proposedTimes || []).map(t => t.start).filter(Boolean).join(', ');
      if (times) parts.push('Proposed times: ' + times);
      if (customer.customerID) parts.push('Thumbtack customer ID: ' + customer.customerID);
      if (request.requestID) parts.push('Request ID: ' + request.requestID);
      if (data.negotiationID) parts.push('Negotiation ID: ' + data.negotiationID);
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