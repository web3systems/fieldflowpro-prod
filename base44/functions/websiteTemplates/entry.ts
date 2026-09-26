import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { assertBuilderApp } from '../../shared/builderAccess.ts';
import { builderTemplateResponse } from '../../shared/builderTemplateResponse.ts';

export default async function(req) {
  try {
    assertBuilderApp();
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const raw = await req.text();
    if (raw.length > 75000) return Response.json({ error: 'Request exceeds the draft safety limit' }, { status: 400 });
    return builderTemplateResponse(JSON.parse(raw));
  } catch (error) {
    console.error('Website template request failed:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
}