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

    return Response.json({ success: true, message: 'Estimate approved' });
  } catch (error) {
    console.error('Error in approveEstimate:', error.message);
    return Response.json({ error: error.message || 'Failed to approve' }, { status: 500 });
  }
});