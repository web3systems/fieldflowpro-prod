import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'super_admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden — managers and admins only' }, { status: 403 });
    }

    const body = await req.json();

    // Mode 1: list ghost jobs (no customer_id or empty string)
    if (body?.action === 'list') {
      const allJobs = await base44.asServiceRole.entities.Job.list('-created_date', 500);
      const ghostJobs = allJobs.filter(j => !j.customer_id);
      return Response.json({
        ghost_count: ghostJobs.length,
        ghost_jobs: ghostJobs.map(j => ({
          id: j.id,
          title: j.title,
          company_id: j.company_id,
          status: j.status,
          created_date: j.created_date,
          created_by: j.created_by,
        })),
      });
    }

    // Mode 2: apply fixes — body.fixes = [{ job_id, customer_id }]
    const fixes = body?.fixes;
    if (!Array.isArray(fixes) || fixes.length === 0) {
      return Response.json({ error: 'Provide "action": "list" or "fixes": [{ job_id, customer_id }]' }, { status: 400 });
    }

    const updates = fixes.map(f => ({ id: f.job_id, customer_id: f.customer_id }));
    const result = await base44.asServiceRole.entities.Job.bulkUpdate(updates);

    return Response.json({
      updated: updates.length,
      result: result.map(j => ({ id: j.id, title: j.title, customer_id: j.customer_id })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}