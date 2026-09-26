import { imageIds, publicDocument } from './builderModel.ts';
export async function verifyBuilderImages(db, companyId, document) {
  const images = await Promise.all(imageIds(document).map(async id => {
    const m = (await db.BuilderMedia.filter({ id, company_id: companyId }, '-created_date', 1))[0];
    if (!m) throw new Error('An image does not belong to this company media library');
    return m;
  }));
  return images;
}
export async function publishBuilderDocument(base44, db, site, user) {
  const document = publicDocument(site.draft);
  const images = await verifyBuilderImages(db, site.company_id, document);
  const assets = {};
  for (const media of images) {
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: media.file_uri, expires_in: 60 });
    const response = await fetch(signed_url);
    if (!response.ok) throw new Error('Could not prepare an image for publication');
    const blob = await response.blob();
    if (blob.size > 5 * 1024 * 1024) throw new Error('Image exceeds publication size limit');
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file: new File([blob], media.name, { type: media.mime }) });
    assets[media.id] = file_url;
  }
  return await db.BuilderRevision.create({ company_id: site.company_id, site_id: site.id, kind: 'published', actor_id: user.id, label: 'Published site snapshot', document: { ...document, assets } });
}
export async function publishedBuilderSite(base44, routeKey) {
  if (typeof routeKey !== 'string' || !/^[a-z0-9-]{1,130}$/.test(routeKey)) throw new Error('Site unavailable');
  const db = base44.asServiceRole.entities;
  const site = (await db.BuilderSite.filter({ route_key: routeKey }, '-created_date', 1))[0];
  if (!site?.published_revision_id) throw new Error('Site unavailable');
  const revision = (await db.BuilderRevision.filter({ id: site.published_revision_id, site_id: site.id, company_id: site.company_id, kind: 'published' }, '-created_date', 1))[0];
  if (!revision) throw new Error('Site unavailable');
  return { site, revision, db };
}