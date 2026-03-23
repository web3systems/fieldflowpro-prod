import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { event, data, old_data } = body;

    // Only trigger on job update to "completed"
    if (event?.type !== 'update') return Response.json({ skipped: 'not an update' });
    if (data?.status !== 'completed') return Response.json({ skipped: 'not completed' });
    if (old_data?.status === 'completed') return Response.json({ skipped: 'already was completed' });
    if (!data?.is_recurring) return Response.json({ skipped: 'not a recurring job' });

    const base44 = createClientFromRequest(req);

    const intervalDays = {
      weekly: 7,
      biweekly: 14,
      monthly: 30,
      quarterly: 91,
    };

    const days = intervalDays[data.recurrence_interval] || 30;
    const baseDate = data.scheduled_start ? new Date(data.scheduled_start) : new Date();
    const nextStart = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    let nextEnd = undefined;
    if (data.scheduled_start && data.scheduled_end) {
      const duration = new Date(data.scheduled_end) - new Date(data.scheduled_start);
      nextEnd = new Date(nextStart.getTime() + duration).toISOString();
    }

    const newJob = {
      company_id: data.company_id,
      customer_id: data.customer_id,
      title: data.title,
      description: data.description || '',
      status: 'scheduled',
      priority: data.priority || 'medium',
      scheduled_start: nextStart.toISOString(),
      scheduled_end: nextEnd,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      service_type: data.service_type,
      assigned_techs: data.assigned_techs || [],
      total_amount: data.total_amount || 0,
      is_recurring: true,
      recurrence_interval: data.recurrence_interval,
      recurrence_parent_id: data.recurrence_parent_id || event.entity_id,
      internal_notes_log: [],
      customer_notes: [],
      photos: [],
    };

    await base44.asServiceRole.entities.Job.create(newJob);

    console.log(`Created next recurring job for ${data.title}, next date: ${nextStart.toISOString()}`);
    return Response.json({ success: true, next_date: nextStart.toISOString() });
  } catch (error) {
    console.error('createNextRecurringJob error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});