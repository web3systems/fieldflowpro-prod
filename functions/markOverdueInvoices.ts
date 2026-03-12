import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split("T")[0];

    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const toMark = invoices.filter(inv =>
      inv.due_date &&
      inv.due_date < today &&
      !["paid", "void", "overdue"].includes(inv.status)
    );

    await Promise.all(toMark.map(inv =>
      base44.asServiceRole.entities.Invoice.update(inv.id, { status: "overdue" })
    ));

    console.log(`Marked ${toMark.length} invoices as overdue`);
    return Response.json({ updated: toMark.length });
  } catch (error) {
    console.error("Error marking overdue invoices:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});