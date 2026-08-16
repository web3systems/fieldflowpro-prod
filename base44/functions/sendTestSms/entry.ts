import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('MESSAGEBIRD_API_KEY');
    if (!apiKey) return Response.json({ error: 'Bird API key not configured' }, { status: 500 });

    const originator = Deno.env.get('MESSAGEBIRD_ORIGINATOR');
    const payload: Record<string, unknown> = {
      to: '+18023995955',
      text: 'FieldFlow Pro Bird SMS test — system online.',
      category: 'marketing',
    };
    if (originator) payload.from = originator;

    const resp = await fetch('https://us1.platform.bird.com/v1/sms/messages', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('Bird test error:', JSON.stringify(data));
      return Response.json({ error: 'Bird send failed', detail: data }, { status: 500 });
    }
    return Response.json({ success: true, id: data.id, status: data.status });
  } catch (err) {
    console.error('sendTestSms error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});