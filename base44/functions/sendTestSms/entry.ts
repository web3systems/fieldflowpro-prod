import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
        },
        body: new URLSearchParams({
          To: '+18023995955',
          From: fromPhone,
          Body: 'FieldFlowPro Twilio test — system online.'
        }).toString()
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Twilio test error:', JSON.stringify(data));
      return Response.json({ error: 'Twilio failed', detail: data }, { status: 500 });
    }

    return Response.json({ success: true, sid: data.sid, status: data.status });
  } catch (err) {
    console.error('sendTestSms error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});