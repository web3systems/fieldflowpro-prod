import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get companies the user has explicit access to
    const accessRecords = await base44.asServiceRole.entities.UserCompanyAccess.filter({
      user_email: user.email
    });

    const allCompanies = await base44.asServiceRole.entities.Company.list();

    const directCompanyIds = new Set(accessRecords.map(a => a.company_id));

    // Also include sub-companies of any company the user has direct access to
    const subCompanyIds = new Set(
      allCompanies
        .filter(c => c.parent_company_id && directCompanyIds.has(c.parent_company_id))
        .map(c => c.id)
    );

    const allAccessibleIds = new Set([...directCompanyIds, ...subCompanyIds]);

    const companies = allCompanies.filter(c => allAccessibleIds.has(c.id));

    // Sort: parent companies first, then sub-companies grouped under their parent
    companies.sort((a, b) => {
      const aIsParent = !a.parent_company_id;
      const bIsParent = !b.parent_company_id;
      if (aIsParent && !bIsParent) return -1;
      if (!aIsParent && bIsParent) return 1;
      return a.name.localeCompare(b.name);
    });

    return Response.json({ companies });
  } catch (error) {
    console.error('getUserCompanies error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});