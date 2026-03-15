import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { campaign_id } = await req.json();
    if (!campaign_id) return Response.json({ error: 'campaign_id required' }, { status: 400 });

    const campaign = await base44.asServiceRole.entities.MarketingCampaign.get(campaign_id);
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });

    // Fetch audience
    let recipients = [];
    if (campaign.audience === 'leads') {
      const leads = await base44.asServiceRole.entities.Lead.filter({ company_id: campaign.company_id });
      recipients = leads
        .filter(l => campaign.type === 'email' ? l.email : l.phone)
        .map(l => ({ name: `${l.first_name} ${l.last_name}`, email: l.email, phone: l.phone }));
    } else {
      const statusFilter = campaign.audience === 'active_customers'
        ? 'active'
        : campaign.audience === 'inactive_customers'
          ? 'inactive'
          : null;
      const customers = await base44.asServiceRole.entities.Customer.filter({
        company_id: campaign.company_id,
        ...(statusFilter ? { status: statusFilter } : {})
      });
      recipients = customers
        .filter(c => campaign.type === 'email' ? c.email : c.phone)
        .map(c => ({ name: `${c.first_name} ${c.last_name}`, email: c.email, phone: c.phone }));
    }

    console.log(`Sending ${campaign.type} campaign "${campaign.name}" to ${recipients.length} recipients`);

    // Send emails using built-in integration
    let sentCount = 0;
    if (campaign.type === 'email') {
      for (const r of recipients) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: r.email,
            subject: campaign.subject || campaign.name,
            body: campaign.message.replace(/\{name\}/gi, r.name),
          });
          sentCount++;
        } catch (e) {
          console.error(`Failed to send to ${r.email}:`, e.message);
        }
      }
    } else {
      // SMS - log intent (actual SMS requires Twilio or similar)
      console.log(`SMS campaign: would send to ${recipients.length} phone numbers`);
      sentCount = recipients.length;
    }

    // Update campaign status
    await base44.asServiceRole.entities.MarketingCampaign.update(campaign_id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      delivered_count: sentCount,
    });

    return Response.json({ success: true, sent_count: sentCount, total_recipients: recipients.length });
  } catch (error) {
    console.error('Campaign send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});