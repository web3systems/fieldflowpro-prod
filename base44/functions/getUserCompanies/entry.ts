import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Always filter by UserCompanyAccess — no role-based fallback
    const accessRecords = await base44.asServiceRole.entities.UserCompanyAccess.filter({
      user_email: user.email
    });

    if (accessRecords.length === 0) {
      return Response.json({ companies: [] });
    }

    const companyIds = accessRecords.map(a => a.company_id);
    const allCompanies = await base44.asServiceRole.entities.Company.list();
    const companies = allCompanies.filter(c => companyIds.includes(c.id));

    return Response.json({ companies });
  } catch (error) {
    console.error('getUserCompanies error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});