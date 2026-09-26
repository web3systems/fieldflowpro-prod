import { secrets } from 'base44:runtime';
export function assertBuilderApp() {
  if (secrets.get('BASE44_APP_ID') !== '69b20e4261ce8a3e5bf093b0') throw new Error('Website Builder is restricted to FieldFlow Pro V1.');
}
export async function builderAccess(base44, companyId) {
  assertBuilderApp();
  const user = await base44.auth.me();
  if (!user) throw new Error('Authentication required');
  if (typeof companyId !== 'string' || !/^[a-f0-9]{24}$/.test(companyId)) throw new Error('Invalid company');
  const db = base44.asServiceRole.entities;
  const company = (await db.Company.filter({ id: companyId }, '-created_date', 1))[0];
  if (!company) throw new Error('Company unavailable');
  const scopes = [companyId, company.parent_company_id].filter(Boolean);
  const accesses = (await Promise.all(scopes.map(id => db.UserCompanyAccess.filter({ company_id: id, user_email: user.email }, '-created_date', 100)))).flat();
  const membership = accesses.some(a => (!a.user_id || a.user_id === user.id) && ['owner', 'manager'].includes(a.role));
  const companyOwner = company.created_by_id === user.id;
  if (!membership && !companyOwner) throw new Error('Website access requires company owner or manager membership');
  return { user, company, db };
}
export async function builderSiteAccess(base44, siteId) {
  assertBuilderApp();
  const user = await base44.auth.me();
  if (!user) throw new Error('Authentication required');
  if (typeof siteId !== 'string' || !/^[a-f0-9]{24}$/.test(siteId)) throw new Error('Site unavailable');
  const site = (await base44.asServiceRole.entities.BuilderSite.filter({ id: siteId }, '-created_date', 1))[0];
  if (!site) throw new Error('Site unavailable');
  return { ...await builderAccess(base44, site.company_id), site };
}