import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { assertBuilderApp } from '../../shared/builderAccess.ts';
import { publishedBuilderSite } from '../../shared/builderPublishing.ts';
import { publicDocument, imageIds } from '../../shared/builderModel.ts';
export default async function(req) {
  try {
    assertBuilderApp();
    const base44 = createClientFromRequest(req);
    const { route_key } = await req.json();
    const { revision } = await publishedBuilderSite(base44, route_key);
    const document = publicDocument(revision.document);
    const assets = {};
    for (const id of imageIds(document)) {
      const url = revision.document.assets?.[id];
      if (typeof url === 'string' && url.startsWith('https://')) assets[id] = url;
    }
    return Response.json({ document, assets }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (_) { return Response.json({ error: 'Published site not found' }, { status: 404 }); }
}