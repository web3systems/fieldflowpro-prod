import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// MessageBird SMS helper (inlined — no local imports in Deno functions)
async function sendSmsMessageBird(toPhoneRaw: string, body: string) {
  const apiKey = Deno.env.get('MESSAGEBIRD_API_KEY');
  const originator = Deno.env.get('MESSAGEBIRD_ORIGINATOR');
  if (!apiKey || !originator) {
    return { ok: false, status: 500, error: 'MessageBird credentials not configured' };
  }

  // Normalize to E.164
  let toPhone = String(toPhoneRaw).replace(/\D/g, '');
  if (toPhone.length === 10) toPhone = '+1' + toPhone;
  else if (!String(toPhoneRaw).trim().startsWith('+')) toPhone = '+' + toPhone;

  const resp = await fetch('https://rest.messagebird.com/messages', {
    method: 'POST',
    headers: {
      'Authorization': `AccessKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipients: [toPhone], originator, body }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    console.error('MessageBird SMS error:', JSON.stringify(data));
    return { ok: false, status: resp.status, error: data.errors?.[0]?.description || data.message || 'MessageBird failed' };
  }
  return { ok: true, id: data.id, href: data.href };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to_phone, message } = await req.json();
    if (!to_phone || !message) {
      return Response.json({ error: 'to_phone and message are required' }, { status: 400 });
    }

    const result = await sendSmsMessageBird(to_phone, message);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ success: true, id: result.id });
  } catch (err) {
    console.error('sendCustomerSms error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});