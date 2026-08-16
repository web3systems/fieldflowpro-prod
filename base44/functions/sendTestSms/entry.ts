import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    const params = new URLSearchParams();
    params.append('From', fromNumber);
    params.append('To', '+18023995955');
    params.append('Body', 'FieldFlow Pro Twilio SMS test — system online.');

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
      console.error('Twilio test error:', JSON.stringify(data));
      return Response.json({ error: 'Twilio send failed', detail: data }, { status: 500 });
    }
    return Response.json({ success: true, id: data.sid, status: data.status });
  } catch (err) {
    console.error('sendTestSms error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});