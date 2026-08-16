import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Twilio SMS helper (inlined — no local imports in Deno functions)
async function sendTwilioSms(toPhoneRaw: string, text: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, status: 500, error: 'Twilio not configured' };
  }

  // Normalize to E.164
  let toPhone = String(toPhoneRaw).replace(/\D/g, '');
  if (toPhone.length === 10) toPhone = '+1' + toPhone;
  else if (!String(toPhoneRaw).trim().startsWith('+')) toPhone = '+' + toPhone;

  const params = new URLSearchParams();
  params.append('From', fromNumber);
  params.append('To', toPhone);
  params.append('Body', text);

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('Twilio SMS error:', JSON.stringify(data));
    return { ok: false, status: resp.status, error: data.message || 'Twilio send failed' };
  }
  return { ok: true, id: data.sid, status: data.status };
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

    const result = await sendTwilioSms(to_phone, message);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ success: true, id: result.id, status: result.status });
  } catch (err) {
    console.error('sendCustomerSms error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});