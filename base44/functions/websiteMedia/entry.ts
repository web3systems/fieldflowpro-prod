import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { builderAccess, assertBuilderApp } from '../../shared/builderAccess.ts';
export default async function(req) {
  try {
    assertBuilderApp();
    const base44 = createClientFromRequest(req);
    if (!await base44.auth.me()) return Response.json({ error: 'Authentication required' }, { status: 401 });
    if (Number(req.headers.get('content-length')) > 6 * 1024 * 1024) throw new Error('Upload exceeds 5 MB image limit');
    const multipart = (req.headers.get('content-type') || '').includes('multipart/form-data');
    const input = multipart ? Object.fromEntries(await req.formData()) : await req.json();
    const { db } = await builderAccess(base44, input.company_id);
    if (input.action === 'list') {
      const offset = Math.max(0, Number(input.offset) || 0);
      const media = await db.BuilderMedia.filter({ company_id: input.company_id }, '-created_date', 24, offset);
      return Response.json({ media: await Promise.all(media.map(async m => ({ id: m.id, name: m.name, url: (await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: m.file_uri, expires_in: 3600 })).signed_url }))), has_more: media.length === 24 });
    }
    if (input.action !== 'upload' || !multipart) throw new Error('Invalid media request');
    const file = input.file;
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !file.size) throw new Error('Choose a JPG, PNG or WebP image under 5 MB');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    const mime = png ? 'image/png' : jpg ? 'image/jpeg' : webp ? 'image/webp' : '';
    if (!mime || file.type !== mime) throw new Error('Image format could not be verified; SVG and HTML are not accepted');
    const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: new File([bytes], name, { type: mime }) });
    const media = await db.BuilderMedia.create({ company_id: input.company_id, name, file_uri, mime });
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 3600 });
    return Response.json({ media: { id: media.id, name, url: signed_url } });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}