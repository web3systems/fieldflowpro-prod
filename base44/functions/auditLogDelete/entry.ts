import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;
    const entityType = event?.entity_name;
    const entityId = event?.entity_id;

    // Only log deletes for Invoice, Estimate, Job
    const trackedEntities = ["Invoice", "Estimate", "Job"];
    if (!trackedEntities.includes(entityType)) {
      return Response.json({ ok: true, skipped: true });
    }

    const snapshot = old_data || data || {};
    const companyId = snapshot.company_id || "unknown";

    await base44.asServiceRole.entities.AuditLog.create({
      company_id: companyId,
      action: "delete",
      entity_type: entityType,
      entity_id: entityId,
      entity_snapshot: snapshot,
      notes: `${entityType} deleted. Snapshot captured at time of deletion.`
    });

    console.log(`[AuditLog] Logged deletion of ${entityType} ${entityId}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[AuditLog] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});