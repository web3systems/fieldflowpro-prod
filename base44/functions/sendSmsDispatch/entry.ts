import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { to_phone, tech_name, job_number, address, scheduled_time, description, message_type, customer_name, invoice_number, balance_due } = body;

    if (!to_phone || !tech_name) {
      return Response.json({ error: 'to_phone and tech_name are required' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromPhone) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    let smsBody;
    if (message_type === 'invoice_reminder') {
      smsBody = `Hi ${customer_name}, you have an outstanding invoice #${invoice_number} for $${balance_due}. Please contact us to arrange payment. - HoneyDo Crew`;
    } else {
      smsBody = `Hi ${tech_name}! You've been dispatched to a job.\n\nJob #${job_number}\nAddress: ${address}\nTime: ${scheduled_time}\nDetails: ${description}\n\nReply DONE when complete. - HoneyDo Crew`;
    }

    const params = new URLSearchParams({ To: to_phone, From: fromPhone, Body: smsBody });
    const credentials = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        body: params.toString()
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Twilio error:', data);
      return Response.json({ error: 'SMS failed', detail: data }, { status: 502 });
    }

    return Response.json({ success: true, sid: data.sid, status: data.status });
  } catch (error) {
    console.error('sendSmsDispatch error:', error);
    return Response.json({ error: 'SMS failed', detail: error.message }, { status: 500 });
  }
});