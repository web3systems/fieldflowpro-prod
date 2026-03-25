import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow scheduled automation calls (no user) but block unauthorized direct calls
    const authHeader = req.headers.get("authorization");
    const isAutomation = !authHeader || authHeader === "";
    if (!isAutomation) {
      const user = await base44.auth.me();
      if (user?.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }
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