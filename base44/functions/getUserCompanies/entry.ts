import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    if (accessRecords.length === 0) {
      return Response.json({ companies: [] });
    }

    const directCompanyIds = [...new Set(accessRecords.map(a => a.company_id))];

    // Fetch only the companies the user has direct access to (no limit issue)
    const directCompanies = await Promise.all(
      directCompanyIds.map(id =>
        base44.asServiceRole.entities.Company.filter({ id }).then(r => r[0]).catch(() => null)
      )
    );
    const validDirectCompanies = directCompanies.filter(Boolean);

    // Find sub-companies of any parent company the user has access to
    const parentIds = validDirectCompanies.filter(c => !c.parent_company_id).map(c => c.id);

    let subCompanies = [];
    if (parentIds.length > 0) {
      const subResults = await Promise.all(
        parentIds.map(pid =>
          base44.asServiceRole.entities.Company.filter({ parent_company_id: pid }).catch(() => [])
        )
      );
      subCompanies = subResults.flat();
    }

    // Merge, deduplicate
    const allMap = new Map();
    for (const c of [...validDirectCompanies, ...subCompanies]) {
      allMap.set(c.id, c);
    }

    const companies = [...allMap.values()].sort((a, b) => {
      const aIsParent = !a.parent_company_id;
      const bIsParent = !b.parent_company_id;
      if (aIsParent && !bIsParent) return -1;
      if (!aIsParent && bIsParent) return 1;
      return a.name.localeCompare(b.name);
    });

    // Attach user's company-level role to each company
    const companiesWithRole = companies.map(c => {
      const access = accessRecords.find(a => a.company_id === c.id);
      // For sub-companies, inherit the parent company's role if no direct access record exists
      const role = access ? access.role : accessRecords.find(a => a.company_id === c.parent_company_id)?.role || 'technician';
      return { ...c, user_role: role };
    });

    return Response.json({ companies: companiesWithRole });
  } catch (error) {
    console.error('getUserCompanies error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});