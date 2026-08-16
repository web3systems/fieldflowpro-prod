import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sendBirdSms(toPhoneRaw: string, text: string) {
  const apiKey = Deno.env.get('MESSAGEBIRD_API_KEY');
  if (!apiKey) return { ok: false, status: 500, error: 'Bird API key not configured' };
  const originator = Deno.env.get('MESSAGEBIRD_ORIGINATOR');
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
    console.error('Bird dispatch error:', JSON.stringify(data));
    return { ok: false, status: resp.status, error: data.error?.message || 'Bird send failed' };
  }
  return { ok: true, id: data.id };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const toPhoneRaw = body.to_phone || body.to;
    const {
      tech_name, job_number, address, scheduled_time,
      description, message_type, customer_name, invoice_number, balance_due
    } = body;

    if (!toPhoneRaw) return Response.json({ error: 'to_phone is required' }, { status: 400 });

    let smsBody;
    if (body.message && String(body.message).trim()) {
      smsBody = String(body.message);
    } else if (message_type === 'invoice_reminder') {
      smsBody = `Hi ${customer_name}, you have an outstanding invoice #${invoice_number} for $${balance_due}. Please contact us to arrange payment. Thank you!`;
    } else {
      smsBody = `Hi ${tech_name}! New job dispatch:\n\nJob #${job_number}\nAddress: ${address}\nTime: ${scheduled_time}\nDetails: ${description}\n\nReply DONE when complete.`;
    }

    const result = await sendBirdSms(toPhoneRaw, smsBody);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ success: true, id: result.id });
  } catch (err) {
    console.error('sendSmsDispatch error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});