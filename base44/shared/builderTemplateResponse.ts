import { validateDocument, templateDocument } from './builderModel.ts';
import { serviceTemplateCatalog } from './serviceTemplateCatalog.ts';
import { templateImageAssets } from './serviceTemplateImages.ts';

export function builderTemplateResponse(body) {
  if (body.action === 'templates') return Response.json({ templates: serviceTemplateCatalog() });
  if (body.action === 'validate') {
    const document = validateDocument(body.document || templateDocument(body.template, 'Sample business'));
    return Response.json({ document, assets: templateImageAssets(document), writes: 0 });
  }
  return Response.json({ error: 'Unsupported template action' }, { status: 400 });
}