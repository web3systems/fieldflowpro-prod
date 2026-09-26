import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { assertBuilderApp, builderAccess, builderSiteAccess } from '../../shared/builderAccess.ts';
import { validateDocument, templateDocument, slug } from '../../shared/builderModel.ts';
import { builderChecks } from '../../shared/builderChecks.ts';
import { verifyBuilderImages, publishBuilderDocument } from '../../shared/builderPublishing.ts';
export default async function(req) {
  try {
    assertBuilderApp();
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const raw = await req.text();
    if (raw.length > 75000) throw new Error('Request exceeds the draft safety limit');
    const body = JSON.parse(raw);
    if (body.action === 'selfCheck') return Response.json(await builderChecks());
    if (body.action === 'validate') return Response.json({ document: validateDocument(body.document || templateDocument(body.template, 'Sample business')), writes: 0 });
    if (['list', 'create'].includes(body.action)) {
      const { db } = await builderAccess(base44, body.company_id);
      if (body.action === 'list') {
        const sites = await db.BuilderSite.filter({ company_id: body.company_id }, '-created_date', 20, Math.max(0, Number(body.offset) || 0));
        return Response.json({ sites: sites.map(s => ({ id: s.id, name: s.name, route_key: s.route_key, published: !!s.published_revision_id })), has_more: sites.length === 20 });
      }
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) throw new Error('Enter a site name up to 120 characters');
      const prefix = slug(body.slug);
      const document = templateDocument(body.template, body.name.trim());
      const site = await db.BuilderSite.create({ company_id: body.company_id, name: body.name.trim(), route_key: `${prefix}-${crypto.randomUUID()}`, draft: document, draft_token: crypto.randomUUID(), domain_status: 'pending' });
      return Response.json({ site });
    }
    const { site, db } = await builderSiteAccess(base44, body.site_id);
    if (body.action === 'load') {
      const media = await verifyBuilderImages(db, site.company_id, validateDocument(site.draft));
      const assets = {};
      for (const m of media) assets[m.id] = (await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: m.file_uri, expires_in: 3600 })).signed_url;
      return Response.json({ site, assets });
    }
    if (body.action === 'revisions') {
      const revisions = await db.BuilderRevision.filter({ site_id: site.id, company_id: site.company_id }, '-created_date', 20, Math.max(0, Number(body.offset) || 0));
      return Response.json({ revisions: revisions.map(r => ({ id: r.id, kind: r.kind, label: r.label, created_date: r.created_date, actor_id: r.actor_id })), has_more: revisions.length === 20 });
    }
    if (body.draft_token !== site.draft_token) return Response.json({ error: 'This draft changed in another session. Reload before saving; your local changes have not been published.' }, { status: 409 });
    const checkpoint = label => db.BuilderRevision.create({ site_id: site.id, company_id: site.company_id, kind: 'checkpoint', actor_id: user.id, label, document: validateDocument(site.draft) });
    let update;
    if (body.action === 'save' || body.action === 'applyAI') {
      const draft = validateDocument(body.document);
      await verifyBuilderImages(db, site.company_id, draft);
      if (body.action === 'applyAI') await checkpoint('Before AI changes');
      update = { draft, name: draft.name, draft_token: crypto.randomUUID() };
    } else if (body.action === 'checkpoint') {
      await checkpoint('Manual draft checkpoint'); return Response.json({ site });
    } else if (body.action === 'restore') {
      const revision = (await db.BuilderRevision.filter({ id: String(body.revision_id), site_id: site.id, company_id: site.company_id }, '-created_date', 1))[0];
      if (!revision) throw new Error('Revision unavailable');
      const draft = validateDocument(revision.document);
      await verifyBuilderImages(db, site.company_id, draft); await checkpoint('Before restoring a revision');
      update = { draft, name: draft.name, draft_token: crypto.randomUUID() };
    } else if (body.action === 'publish') {
      if (body.confirm_public !== true) throw new Error('Confirm publication of selected pages and their media');
      await checkpoint('Draft before publication');
      const revision = await publishBuilderDocument(base44, db, site, user);
      update = { published_revision_id: revision.id, draft_token: crypto.randomUUID() };
    } else if (body.action === 'unpublish') {
      update = { published_revision_id: '', draft_token: crypto.randomUUID() };
    } else if (body.action === 'domain') {
      const host = String(body.hostname || '').trim().toLowerCase();
      if (host && (host.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host))) throw new Error('Enter a domain name without a protocol or path');
      update = { requested_domain: host, domain_status: 'pending', draft_token: crypto.randomUUID() };
    } else throw new Error('Unsupported website action');
    const updated = await db.BuilderSite.update(site.id, update);
    return Response.json({ site: updated });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}