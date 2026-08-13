import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { estimate_id, customer_id } = await req.json();

    if (!estimate_id || !customer_id) {
      return Response.json({ error: 'estimate_id and customer_id required' }, { status: 400 });
    }

    // Verify customer owns this estimate
    const estimates = await base44.asServiceRole.entities.Estimate.filter({ id: estimate_id });
    const estimate = estimates[0];
    if (!estimate || estimate.customer_id !== customer_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only allow action on pending estimates
    if (!['sent', 'viewed'].includes(estimate.status)) {
      return Response.json({ error: 'Estimate cannot be updated at this stage' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Estimate.update(estimate_id, { status: 'approved' });

    // Create a job from the estimate if one doesn't already exist
    const existingJobs = await base44.asServiceRole.entities.Job.filter({ estimate_id });
    if (existingJobs.length === 0) {
      // Generate sequential job number per company
      const companyJobs = await base44.asServiceRole.entities.Job.filter({ company_id: estimate.company_id });
      const maxNum = companyJobs.reduce((max: number, j: any) => {
        const m = j.job_number?.match(/JOB-(\d+)/);
        return m ? Math.max(max, parseInt(m[1])) : max;
      }, 0);
      const job_number = `JOB-${String(maxNum + 1).padStart(4, '0')}`;

      const opt = estimate.options && estimate.options[0];
      const lineItems = (opt?.line_items || estimate.line_items || []).map((it: any) => ({
        ...it,
        category: it.category === 'labor' ? 'service'
          : it.category === 'materials' ? 'material'
          : it.category || 'service',
      }));
      await base44.asServiceRole.entities.Job.create({
        company_id: estimate.company_id,
        customer_id: estimate.customer_id,
        estimate_id: estimate.id,
        title: estimate.title,
        job_number,
        description: '',
        status: estimate.scheduled_start ? 'scheduled' : 'new',
        scheduled_start: estimate.scheduled_start || '',
        scheduled_end: estimate.scheduled_end || '',
        total_amount: opt?.total ?? estimate.total ?? 0,
        tax_rate: opt?.tax_rate ?? 0,
        line_items: lineItems,
        notes: estimate.notes || '',
        scope_of_work: estimate.scope_of_work || '',
      });
    }

    return Response.json({ success: true, message: 'Estimate approved and job created' });
  } catch (error) {
    console.error('Error in approveEstimate:', error.message);
    return Response.json({ error: error.message || 'Failed to approve' }, { status: 500 });
  }
});