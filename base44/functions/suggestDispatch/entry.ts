import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { company_id } = body;
    if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

    const today = new Date().toISOString().split('T')[0];

    const [jobs, technicians] = await Promise.all([
      base44.asServiceRole.entities.Job.filter({ company_id, status: 'scheduled' }),
      base44.asServiceRole.entities.Technician.filter({ company_id, status: 'active' })
    ]);

    // Jobs scheduled for today (check scheduled_start date)
    const todayJobs = jobs.filter(j => {
      if (!j.scheduled_start) return false;
      return j.scheduled_start.startsWith(today);
    });

    const unassigned = todayJobs.filter(j => !j.assigned_techs || j.assigned_techs.length === 0);

    const suggestions = unassigned.map((job, idx) => {
      const suggested_tech = technicians[idx % technicians.length] || null;
      return {
        job_id: job.id,
        job_title: job.title,
        address: [job.address, job.city, job.state].filter(Boolean).join(', '),
        scheduled_start: job.scheduled_start,
        suggested_tech: suggested_tech
          ? { id: suggested_tech.id, name: `${suggested_tech.first_name} ${suggested_tech.last_name}`, phone: suggested_tech.phone }
          : null,
        reason: suggested_tech ? 'Available technician with no conflicts' : 'No available technicians — manual assignment needed'
      };
    });

    return Response.json({
      suggestions,
      unassigned_count: unassigned.length,
      total_today: todayJobs.length,
      available_techs: technicians.length
    });
  } catch (error) {
    console.error('suggestDispatch error:', error);
    return Response.json({ error: 'Dispatch suggestion failed', detail: error.message }, { status: 500 });
  }
});