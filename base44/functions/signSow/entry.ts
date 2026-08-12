import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { job_id, revision_id, signed_by_name, action } = await req.json();
    if (!job_id || !revision_id) return Response.json({ error: 'job_id and revision_id required' }, { status: 400 });
    if (!signed_by_name || !signed_by_name.trim()) return Response.json({ error: 'Name is required to sign' }, { status: 400 });

    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    const job = jobs[0];
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    const revision = (job.scope_of_work_revisions || []).find(r => r.id === revision_id);
    if (!revision) return Response.json({ error: 'Revision not found' }, { status: 404 });
    if (revision.status === 'signed') return Response.json({ error: 'This document has already been signed' }, { status: 400 });

    const decision = action === 'decline' ? 'declined' : 'signed';
    const now = new Date().toISOString();

    const updatedRevisions = (job.scope_of_work_revisions || []).map(r =>
      r.id === revision_id
        ? {
            ...r,
            status: decision,
            signed_by_name: signed_by_name.trim(),
            signed_at: now,
            signature_ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || '',
          }
        : r
    );

    await base44.asServiceRole.entities.Job.update(job_id, { scope_of_work_revisions: updatedRevisions });

    // Log an activity on the job
    await base44.asServiceRole.entities.Activity.create({
      company_id: job.company_id,
      type: 'note',
      related_to_type: 'job',
      related_to_id: job_id,
      title: `Scope of Work ${decision === 'signed' ? 'signed' : 'declined'}: ${revision.title || 'Revision'}`,
      content: `${signed_by_name.trim()} ${decision === 'signed' ? 'signed' : 'declined'} "${revision.title || 'Revised Statement of Work'}" on ${now}`,
      created_by_name: signed_by_name.trim(),
    }).catch(() => {});

    return Response.json({ success: true, status: decision });
  } catch (error) {
    console.error('signSow error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}