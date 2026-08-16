import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Bird platform SMS helper (inlined — no local imports in Deno functions)
async function sendBirdSms(toPhoneRaw: string, text: string) {
  const apiKey = Deno.env.get('MESSAGEBIRD_API_KEY');
  if (!apiKey) return { ok: false, status: 500, error: 'Bird API key not configured' };

  const originator = Deno.env.get('MESSAGEBIRD_ORIGINATOR');

  // Normalize to E.164
  let toPhone = String(toPhoneRaw).replace(/\D/g, '');
  if (toPhone.length === 10) toPhone = '+1' + toPhone;
  else if (!String(toPhoneRaw).trim().startsWith('+')) toPhone = '+' + toPhone;

  const payload: Record<string, unknown> = { to: toPhone, text, category: 'marketing' };
  if (originator) payload.from = originator;

  const resp = await fetch('https://us1.platform.bird.com/v1/sms/messages', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('Bird SMS error:', JSON.stringify(data));
    return { ok: false, status: resp.status, error: data.error?.message || data.message || 'Bird send failed' };
  }
  return { ok: true, id: data.id, status: data.status };
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

    const result = await sendBirdSms(to_phone, message);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ success: true, id: result.id, status: result.status });
  } catch (err) {
    console.error('sendCustomerSms error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});