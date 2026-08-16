import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromPhone) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const body = await req.json();
    // Accept both { to_phone } (legacy) and { to } (Dispatch.jsx caller),
    // and a precomposed { message }. Fall back to building from fields.
    const toPhoneRaw = body.to_phone || body.to;
    const {
      tech_name, job_number, address, scheduled_time,
      description, message_type, customer_name, invoice_number, balance_due
    } = body;

    if (!toPhoneRaw) {
      return Response.json({ error: 'to_phone is required' }, { status: 400 });
    }

    let smsBody;
    if (body.message && String(body.message).trim()) {
      smsBody = String(body.message);
    } else if (message_type === 'invoice_reminder') {
      smsBody = `Hi ${customer_name}, you have an outstanding invoice #${invoice_number} for $${balance_due}. Please contact us to arrange payment. Thank you!`;
    } else {
      smsBody = `Hi ${tech_name}! New job dispatch:\n\nJob #${job_number}\nAddress: ${address}\nTime: ${scheduled_time}\nDetails: ${description}\n\nReply DONE when complete.`;
    }

    // Normalize phone to E.164
    let toPhone = String(toPhoneRaw).replace(/\D/g, '');
    if (toPhone.length === 10) toPhone = '+1' + toPhone;
    else if (!String(toPhoneRaw).trim().startsWith('+')) toPhone = '+' + toPhone;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
        },
        body: new URLSearchParams({ To: toPhone, From: fromPhone, Body: smsBody }).toString()
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Twilio error:', JSON.stringify(data));
      return Response.json({ error: 'Twilio failed', detail: data }, { status: 500 });
    }

    return Response.json({ success: true, sid: data.sid, status: data.status });
  } catch (err) {
    console.error('sendSmsDispatch error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});