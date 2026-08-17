import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Twilio WhatsApp helper (inlined — no local imports in Deno functions).
// Reuses the existing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER secrets.
//
// WhatsApp has two message modes (enforced by WhatsApp, not Twilio):
//   1. Template (business-initiated): pre-approved template + content variables.
//      Pass `content_sid` (and optional `content_variables` JSON string).
//   2. Session (free-form): only valid within 24h of the customer messaging you.
//      Pass `body` with the plain text.
async function sendTwilioWhatsApp(toPhoneRaw: string, opts: { body?: string; content_sid?: string; content_variables?: string }) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, status: 500, error: 'Twilio not configured' };
  }
  if (!opts.body && !opts.content_sid) {
    return { ok: false, status: 400, error: 'Either body or content_sid is required' };
  }

  // Normalize to E.164, then prefix with whatsapp:
  let toPhone = String(toPhoneRaw).replace(/\D/g, '');
  if (toPhone.length === 10) toPhone = '+1' + toPhone;
  else if (!String(toPhoneRaw).trim().startsWith('+')) toPhone = '+' + toPhone;

  const params = new URLSearchParams();
  params.append('From', `whatsapp:${fromNumber}`);
  params.append('To', `whatsapp:${toPhone}`);
  if (opts.body) params.append('Body', opts.body);
  if (opts.content_sid) params.append('ContentSid', opts.content_sid);
  if (opts.content_variables) params.append('ContentVariables', opts.content_variables);

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
    console.error('Twilio WhatsApp error:', JSON.stringify(data));
    return { ok: false, status: resp.status, error: data.message || 'Twilio WhatsApp send failed' };
  }
  return { ok: true, id: data.sid, status: data.status };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to_phone, body, content_sid, content_variables } = await req.json();
    if (!to_phone) {
      return Response.json({ error: 'to_phone is required' }, { status: 400 });
    }

    const result = await sendTwilioWhatsApp(to_phone, { body, content_sid, content_variables });
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ success: true, id: result.id, status: result.status });
  } catch (err) {
    console.error('sendWhatsApp error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}