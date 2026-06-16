import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { event, data } = await req.json();
    const domain = data?.mail_domain;
    const verified = data?.mail_domain_verified;
    const settingsId = event?.entity_id;

    if (!domain || !verified || !settingsId) {
      return Response.json({ skipped: true, reason: 'Missing domain or not verified' });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      console.error('RESEND_API_KEY not set');
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    // Check if domain already exists in Resend
    const listRes = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = (listData.data || []).find(
        (d) => d.name?.toLowerCase() === domain.toLowerCase()
      );
      if (existing) {
        console.log(`Domain ${domain} already exists in Resend (status: ${existing.status})`);
        return Response.json({ skipped: true, reason: 'Domain already exists in Resend', status: existing.status });
      }
    }

    // Register domain with Resend
    const createRes = await fetch('https://api.resend.com/domains', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain, region: 'us-east-1' }),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      console.error('Resend domain creation failed:', createData);
      return Response.json({ error: 'Failed to register domain', details: createData }, { status: 400 });
    }

    console.log(`Domain ${domain} registered with Resend:`, createData);
    return Response.json({ success: true, domain, resend_id: createData.id, records: createData.records });
  } catch (error) {
    console.error('registerResendDomain error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});