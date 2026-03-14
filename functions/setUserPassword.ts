import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const { userId, password } = await req.json();

    if (!userId || !password) {
      return Response.json({ error: 'userId and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Update user record with a hashed-ready password via service role
    // Base44 supports updating user password via the users service role API
    await base44.asServiceRole.users.setPassword(userId, password);

    return Response.json({ success: true });
  } catch (error) {
    console.error('setUserPassword error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});