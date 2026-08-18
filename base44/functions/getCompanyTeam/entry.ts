import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: any = {};
    try { payload = await req.json(); } catch (e) { payload = {}; }
    const companyId = payload.company_id;
    if (!companyId) return Response.json({ error: 'company_id required' }, { status: 400 });

    // Service role bypasses RLS so any team member can see the full team list.
    const access: any[] = await base44.asServiceRole.entities.UserCompanyAccess.filter({ company_id: companyId });
    const team = access
      .filter(a => a.user_id || a.user_email)
      .map(a => ({
        user_id: a.user_id || '',
        user_name: a.user_name || a.user_email || '',
        user_email: a.user_email || '',
        role: a.role || '',
      }));
    return Response.json({ team });
  } catch (error) {
    console.error('getCompanyTeam error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});