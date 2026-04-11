import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { userId, email, password } = await req.json();

    if ((!userId && !email) || !password) {
      return Response.json({ error: 'userId or email and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    let targetUserId = userId;
    if (!targetUserId && email) {
      // Look up user by email
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      targetUserId = users[0].id;
    }
    
    await base44.asServiceRole.entities.User.update(targetUserId, { password });
  } catch (error) {
    console.error('setUserPassword error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});