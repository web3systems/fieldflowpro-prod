import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pending = await base44.asServiceRole.entities.PendingPassword.filter({ email: user.email });
    if (pending.length === 0) {
      return Response.json({ applied: false });
    }

    const { id: pendingId, password } = pending[0];
    await base44.asServiceRole.entities.User.update(user.id, { password });
    console.log('Applied pending password for:', user.email);

    await base44.asServiceRole.entities.PendingPassword.delete(pendingId);

    return Response.json({ applied: true });
  } catch (error) {
    console.error('applyPendingPassword error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});