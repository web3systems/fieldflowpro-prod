import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get companies the user has explicit access to via UserCompanyAccess
    const accessRecords = await base44.asServiceRole.entities.UserCompanyAccess.filter({
      user_email: user.email
    });

    let companiesWithRole = [];

    if (accessRecords.length > 0) {
      const directCompanyIds = [...new Set(accessRecords.map(a => a.company_id))];

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

      companiesWithRole = companies.map(c => {
        const access = accessRecords.find(a => a.company_id === c.id);
        const role = access ? access.role : accessRecords.find(a => a.company_id === c.parent_company_id)?.role || 'technician';
        return { ...c, user_role: role };
      });
    }

    // Fallback for existing users with no UserCompanyAccess records:
    // Check if user has a company_id on their profile (set during onboarding)
    if (companiesWithRole.length === 0 && user.company_id) {
      try {
        const company = await base44.asServiceRole.entities.Company.filter({ id: user.company_id });
        if (company.length > 0) {
          const role = user.role === 'admin' ? 'owner' : (user.role === 'manager' ? 'manager' : 'technician');
          companiesWithRole = [{ ...company[0], user_role: role }];

          // Auto-seed the missing UserCompanyAccess record so future logins work correctly
          try {
            await base44.asServiceRole.entities.UserCompanyAccess.create({
              user_email: user.email,
              user_id: user.id,
              user_name: user.full_name || '',
              company_id: user.company_id,
              role: role
            });
          } catch (_) {
            // Record may already exist or creation failed — not fatal
          }
        }
      } catch (_) {
        // Fallback query failed — not fatal
      }
    }

    return Response.json({ companies: companiesWithRole });
  } catch (error) {
    console.error('getUserCompanies error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});