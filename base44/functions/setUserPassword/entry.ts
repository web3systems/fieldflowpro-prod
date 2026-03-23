import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, password } = await req.json();

    if (!userId || !password) {
      return Response.json({ error: 'userId and password are required' }, { status: 400 });
    }

    // Allow admins to change anyone's password, or users to change only their own
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isSelf = user.id === userId;
    if (!isAdmin && !isSelf) {
      return Response.json({ error: 'Forbidden: You can only change your own password' }, { status: 403 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(userId, { password });

    return Response.json({ success: true });
  } catch (error) {
    console.error('setUserPassword error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});