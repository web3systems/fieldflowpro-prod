import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { assertBuilderApp } from '../../shared/builderAccess.ts';
import { publishedBuilderSite } from '../../shared/builderPublishing.ts';
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(b => b.toString(16).padStart(2, '0')).join('');
const clean = (v, max, required = false) => { if (typeof v !== 'string' || v.length > max || (required && !v.trim())) throw new Error('Check required fields and input lengths'); if (/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) throw new Error('Enter plain text without HTML markup or control characters'); return v.trim(); };
export default async function(req) {
  try {
    assertBuilderApp();
    const base44 = createClientFromRequest(req);
    const raw = await req.text(); if (raw.length > 8000) throw new Error('Request too large');
    const body = JSON.parse(raw);
    const { site, revision, db } = await publishedBuilderSite(base44, body.route_key);
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const ipHash = await hash(site.id + ':' + ip);
    if (body.action === 'challenge') {
      const recent = await db.BuilderSubmission.filter({ site_id: site.id, ip_hash: ipHash, created_date: { $gte: new Date(Date.now() - 600000).toISOString() } }, '-created_date', 6);
      if (recent.length >= 5) return Response.json({ error: 'Too many requests. Please wait ten minutes.' }, { status: 429 });
      const challenge = crypto.randomUUID();
      await db.BuilderSubmission.create({ site_id: site.id, company_id: site.company_id, ip_hash: ipHash, state: 'issued', challenge, expires_at: new Date(Date.now() + 600000).toISOString() });
      return Response.json({ challenge });
    }
    if (body.action !== 'submit' || typeof body.challenge !== 'string') throw new Error('Invalid request');
    const ticket = (await db.BuilderSubmission.filter({ site_id: site.id, challenge: body.challenge, ip_hash: ipHash }, '-created_date', 1))[0];
    if (!ticket || Date.parse(ticket.expires_at) < Date.now()) throw new Error('Request expired. Reload the page before trying again');
    if (ticket.state === 'complete') return Response.json({ received: true });
    if (ticket.state !== 'issued') throw new Error('This request is already being processed. Do not resubmit');
    if (body.website || body.consent !== 'yes' || !Number.isFinite(body.started_at) || Date.now() - body.started_at < 2500) throw new Error('Please complete the form and consent checkbox');
    const block = revision.document.pages.filter(p => p.visible).flatMap(p => p.blocks).find(b => b.id === body.block_id && ['contact', 'booking'].includes(b.type));
    if (!block) throw new Error('This form is not published');
    const first_name = clean(body.first_name, 120, true), last_name = clean(body.last_name, 120, true), email = clean(body.email, 120, true).toLowerCase();
    const phone = clean(body.phone || '', 120), service = clean(body.service, 160, true), message = clean(body.message, 2000, true);
    if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) throw new Error('Enter a valid email');
    const preferred_date = clean(body.preferred_date || '', 10);
    if (block.type === 'booking' && (!/^\d{4}-\d{2}-\d{2}$/.test(preferred_date) || Number.isNaN(Date.parse(preferred_date)) || preferred_date < new Date().toISOString().slice(0, 10))) throw new Error('Choose a valid preferred date');
    const fingerprint = await hash([site.id, email, service, message, block.type, preferred_date].join('|'));
    const duplicates = await db.BuilderSubmission.filter({ site_id: site.id, fingerprint, state: 'complete', created_date: { $gte: new Date(Date.now() - 86400000).toISOString() } }, '-created_date', 1);
    if (duplicates.length) { await db.BuilderSubmission.update(ticket.id, { state: 'complete', fingerprint }); return Response.json({ received: true }); }
    await db.BuilderSubmission.update(ticket.id, { state: 'processing', fingerprint });
    const notes = `Website source: ${site.route_key}\nForm: ${block.type}\nContact consent given for this request.\n${message}`;
    // Bulk insert intentionally suppresses entity-triggered emails/automations. No confirmed jobs or payments.
    const records = block.type === 'booking'
      ? await db.ServiceBooking.bulkCreate([{ company_id: site.company_id, first_name, last_name, email, phone, service_type: service, preferred_date, notes, status: 'pending' }])
      : await db.Lead.bulkCreate([{ company_id: site.company_id, first_name, last_name, email, phone, service_interest: service, notes, source: 'website', status: 'new' }]);
    await db.BuilderSubmission.update(ticket.id, { state: 'complete', record_id: records[0]?.id || '' });
    return Response.json({ received: true });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}