import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to_phone, message } = await req.json();

    if (!to_phone || !message) {
      return Response.json({ error: 'to_phone and message are required' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromPhone) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    // Normalize phone number — add +1 if no country code
    let toPhone = to_phone.replace(/\D/g, '');
    if (toPhone.length === 10) toPhone = '+1' + toPhone;
    else if (!toPhone.startsWith('+')) toPhone = '+' + toPhone;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
        },
        body: new URLSearchParams({
          To: toPhone,
          From: fromPhone,
          Body: message
        }).toString()
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Twilio SMS error:', JSON.stringify(data));
      return Response.json({ error: data.message || 'Twilio failed' }, { status: 500 });
    }

    return Response.json({ success: true, sid: data.sid, status: data.status });
  } catch (err) {
    console.error('sendCustomerSms error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});