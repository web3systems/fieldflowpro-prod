import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('MESSAGEBIRD_API_KEY');
    const originator = Deno.env.get('MESSAGEBIRD_ORIGINATOR');
    if (!apiKey || !originator) {
      return Response.json({ error: 'MessageBird credentials not configured' }, { status: 500 });
    }

    const resp = await fetch('https://rest.messagebird.com/messages', {
      method: 'POST',
      headers: { 'Authorization': `AccessKey ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients: ['+18023995955'], originator, body: 'FieldFlow Pro MessageBird test — system online.' }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('MessageBird test error:', JSON.stringify(data));
      return Response.json({ error: 'MessageBird failed', detail: data }, { status: 500 });
    }
    return Response.json({ success: true, id: data.id });
  } catch (err) {
    console.error('sendTestSms error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});