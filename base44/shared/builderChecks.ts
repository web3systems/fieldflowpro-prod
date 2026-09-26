import { templateDocument, validateDocument, publicDocument, safeLink } from './builderModel.ts';
import { builderAccess } from './builderAccess.ts';
export async function builderChecks() {
  const results = [];
  const check = (name, test) => { try { if (!test()) throw new Error('Assertion failed'); results.push({ name, passed: true }); } catch (error) { results.push({ name, passed: false, error: error.message }); } };
  const rejects = fn => { try { fn(); return false; } catch (_) { return true; } };
  const fixture = () => templateDocument('field', 'Nonproduction sample');
  for (const key of ['field', 'local', 'consulting', 'startup']) check(`${key} template validates`, () => validateDocument(templateDocument(key, 'Sample')).pages.length === 3);
  check('Reject duplicate page slugs', () => { const d = fixture(); d.pages[1].slug = 'home'; return rejects(() => validateDocument(d)); });
  check('Reject unsupported schema version', () => { const d = fixture(); d.schema_version = 2; return rejects(() => validateDocument(d)); });
  check('Reject javascript and data links', () => rejects(() => safeLink('javascript:alert(1)')) && rejects(() => safeLink('data:text/html,test')));
  check('Reject protocol-relative links', () => rejects(() => safeLink('//untrusted.example')));
  check('Allow supported links', () => safeLink('/services') === '/services' && safeLink('https://example.com') === 'https://example.com/');
  check('Reject arbitrary block types', () => { const d = fixture(); d.pages[0].blocks[0].type = 'script'; return rejects(() => validateDocument(d)); });
  check('Drop unknown configuration fields', () => { const d = fixture(); d.private_configuration = 'do not publish'; d.pages[0].blocks[0].html = '<script>bad()</script>'; const clean = validateDocument(d); return !('private_configuration' in clean) && !('html' in clean.pages[0].blocks[0]); });
  check('Strip hidden pages, hidden navigation and reusable drafts', () => { const d = fixture(); d.pages[1].visible = false; d.reusable = [d.pages[0].blocks[0]]; const p = publicDocument(d); return p.pages.length === 2 && !p.menu.some(m => m.slug === 'services') && p.reusable.length === 0; });
  check('Published projection does not mutate draft', () => { const d = fixture(); const before = JSON.stringify(d); const p = publicDocument(d); p.pages[0].blocks[0].title = 'Changed snapshot'; return JSON.stringify(d) === before; });
  check('Reject missing home page', () => { const d = fixture(); d.pages[0].visible = false; return rejects(() => validateDocument(d)); });
  check('Reject oversized content', () => { const d = fixture(); d.footer = 'x'.repeat(66000); return rejects(() => validateDocument(d)); });
  const companyId = '111111111111111111111111', parentId = '222222222222222222222222';
  async function accessCheck(name, user, memberships, expected, parent = false) {
    const mock = { auth: { me: async () => user }, asServiceRole: { entities: {
      Company: { filter: async () => [{ id: companyId, created_by_id: 'owner-id', parent_company_id: parent ? parentId : '' }] },
      UserCompanyAccess: { filter: async query => memberships.filter(m => m.company_id === query.company_id && m.user_email === query.user_email) }
    } } };
    let allowed = true; try { await builderAccess(mock, companyId); } catch (_) { allowed = false; }
    results.push({ name, passed: allowed === expected });
  }
  const member = { id: 'member-id', email: 'sample@example.invalid', role: 'user', company_id: companyId };
  const membership = { company_id: companyId, user_email: member.email, user_id: member.id, role: 'manager' };
  await accessCheck('Anonymous access denied (mock identity)', null, [], false);
  await accessCheck('Company owner allowed (mock identity)', { ...member, id: 'owner-id' }, [], true);
  await accessCheck('Explicit company manager allowed (mock membership)', member, [membership], true);
  await accessCheck('Standard team role denied (mock membership)', member, [{ ...membership, role: 'standard' }], false);
  await accessCheck('Mutable active-company profile is not authorization', member, [], false);
  await accessCheck('Global admin without tenant membership denied', { ...member, role: 'admin' }, [], false);
  await accessCheck('Different tenant membership denied', member, [{ ...membership, company_id: parentId }], false);
  await accessCheck('Mismatched membership user ID denied', member, [{ ...membership, user_id: 'someone-else' }], false);
  await accessCheck('Parent company manager inherits subsidiary access', member, [{ ...membership, company_id: parentId }], true, true);
  return { results, passed: results.every(r => r.passed), writes: 0, ai_calls: 0, communications: 0 };
}