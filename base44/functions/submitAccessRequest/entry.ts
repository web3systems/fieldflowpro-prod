import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, name, message } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Check for existing pending request
    const existing = await base44.asServiceRole.entities.AccessRequest.filter({ email, status: "pending" });
    if (existing.length > 0) {
      return Response.json({ success: true, alreadyExists: true });
    }

    await base44.asServiceRole.entities.AccessRequest.create({
      email,
      name: name || "",
      message: message || "",
      status: "pending",
    });

    console.log(`Access request submitted for: ${email}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error("submitAccessRequest error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});