import { serviceTemplateDocument } from './serviceTemplateDocument.ts';
export const modelVersion = 1;
const fail = message => { throw new Error(message); };
const text = (v, max = 500) => typeof v === 'string' && v.length <= max ? v : fail('Invalid or oversized text');
const choice = (v, options) => options.includes(v) ? v : fail('Unsupported design option');
const list = (v, max) => Array.isArray(v) && v.length <= max ? v : fail('Content exceeds the supported size');
const color = v => /^#[0-9a-f]{6}$/i.test(v) ? v : fail('Use six-digit hex colors');
export const slug = v => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 70 ? v : fail('Slugs must use lowercase letters, numbers and single hyphens');
export function safeLink(v) {
  text(v, 500);
  if (!v || /^#[a-z0-9-]+$/.test(v) || /^\/[a-z0-9-]+$/.test(v) || /^mailto:[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v) || /^tel:\+?[0-9 ()-]+$/.test(v)) return v;
  try { const u = new URL(v); if (u.protocol === 'https:' && !u.username && !u.password) return u.href; } catch (_) { /* rejected below */ }
  return fail('Links must use HTTPS, mailto, tel, a page slug or an anchor');
}
export function validateBlock(b) {
  return { id: slug(b.id), type: choice(b.type, ['hero', 'text', 'image', 'cta', 'contact', 'booking']), title: text(b.title, 200),
    body: list(b.body, 100).map(r => ({ text: text(r.text, 3000), bold: r.bold === true, italic: r.italic === true, underline: r.underline === true })),
    image_id: text(b.image_id || '', 50), alt: text(b.alt || '', 250), button: text(b.button || '', 80), href: safeLink(b.href || ''),
    layout: choice(b.layout, ['stack', 'split', 'center']), spacing: choice(b.spacing, ['compact', 'normal', 'roomy']),
    background: color(b.background), foreground: color(b.foreground) };
}
function unique(items, key) { if (new Set(items.map(x => x[key])).size !== items.length) fail('Duplicate ' + key); }
export function validateDocument(d) {
  if (!d || d.schema_version !== 1) fail('Unsupported content schema version');
  if (JSON.stringify(d).length > 65000) fail('Draft exceeds the current 65 KB safety limit; reduce content before saving');
  const pages = list(d.pages, 30).map(p => ({ id: slug(p.id), kind: choice(p.kind, ['page', 'post']), title: text(p.title, 160), slug: slug(p.slug), visible: p.visible === true,
    seo_title: text(p.seo_title || '', 160), seo_description: text(p.seo_description || '', 320), category: text(p.category || '', 80), blocks: list(p.blocks, 25).map(validateBlock) }));
  if (!pages.length || !pages.some(p => p.slug === 'home' && p.kind === 'page' && p.visible)) fail('Keep a visible home page');
  unique(pages, 'slug'); unique(pages, 'id'); pages.forEach(p => unique(p.blocks, 'id'));
  const categories = list(d.categories || [], 30).map(x => text(x, 80));
  if (new Set(categories).size !== categories.length) fail('Duplicate categories');
  if (pages.some(p => p.category && !categories.includes(p.category))) fail('Select an existing category');
  const menu = list(d.menu, 30).map(m => ({ label: text(m.label, 80), slug: slug(m.slug) }));
  if (menu.some(m => !pages.some(p => p.slug === m.slug))) fail('Menus must point to existing pages or posts');
  const reusable = list(d.reusable || [], 30).map(validateBlock); unique(reusable, 'id');
  return { schema_version: 1, name: text(d.name, 120), tagline: text(d.tagline || '', 240), footer: text(d.footer || '', 500),
    theme: { primary: color(d.theme.primary), background: color(d.theme.background), foreground: color(d.theme.foreground), font: choice(d.theme.font, ['sans', 'serif', 'mono']), radius: choice(d.theme.radius, ['square', 'soft', 'round']) }, categories, menu, pages, reusable };
}
export function publicDocument(d) {
  const clean = validateDocument(d); clean.pages = clean.pages.filter(p => p.visible);
  clean.menu = clean.menu.filter(m => clean.pages.some(p => p.slug === m.slug)); clean.reusable = [];
  return clean;
}
export const imageIds = d => [...new Set([...d.pages.flatMap(p => p.blocks), ...(d.reusable || [])].map(b => b.image_id).filter(Boolean))];
export function templateDocument(template, name) {
  const serviceDocument = serviceTemplateDocument(template, name);
  if (serviceDocument) return validateDocument(serviceDocument);
  const profiles = { field: ['Practical help for your next project', 'Field services', '#2563eb', 'split'], local: ['A local service built around you', 'Local services', '#0f766e', 'center'], consulting: ['A clear next step for your business', 'Consulting & freelance', '#4338ca', 'split'], startup: ['Your next chapter starts here', 'New business', '#9f1239', 'center'] };
  const [title, label, primary, layout] = profiles[template] || profiles.startup;
  const block = (id, type, heading, body) => ({ id, type, title: heading, body: [{ text: body, bold: false, italic: false, underline: false }], image_id: '', alt: '', button: '', href: '', layout, spacing: 'roomy', background: '#ffffff', foreground: '#172033' });
  const page = (id, heading, blocks) => ({ id, slug: id, kind: 'page', title: heading, visible: true, seo_title: heading, seo_description: '', category: '', blocks });
  return validateDocument({ schema_version: 1, name, tagline: 'Sample website — customize before publishing', footer: 'Sample content. Replace with your own business details.', theme: { primary, background: '#ffffff', foreground: '#172033', font: template === 'consulting' ? 'serif' : 'sans', radius: 'soft' }, categories: [], reusable: [], menu: [{ label: 'Home', slug: 'home' }, { label: 'Services', slug: 'services' }, { label: 'About', slug: 'about' }], pages: [page('home', 'Home', [block('hero', 'hero', title, 'Sample introduction: describe who you help, what you offer, and how to get started.'), block('approach', 'text', 'Your approach', 'Sample section: explain your process in your own words.'), { ...block('next-step', 'cta', 'Explore your next step', 'Sample call to action: invite visitors to learn about your services.'), button: 'Explore services', href: '/services' }]), page('services', 'Services', [block('services-intro', 'hero', label, 'Sample services: replace this with your actual offerings, service area, and terms.')]), page('about', 'About', [block('about-intro', 'text', 'Tell your story', 'Sample about page: introduce your business or new side hustle. Only include claims you can verify.')])] });
}
const str = { type: 'string' }, bool = { type: 'boolean' };
const obj = properties => ({ type: 'object', properties, required: Object.keys(properties) });
const arr = items => ({ type: 'array', items });
const runSchema = obj({ text: str, bold: bool, italic: bool, underline: bool });
const blockSchema = obj({ id: str, type: str, title: str, body: arr(runSchema), image_id: str, alt: str, button: str, href: str, layout: str, spacing: str, background: str, foreground: str });
const pageSchema = obj({ id: str, kind: str, title: str, slug: str, visible: bool, seo_title: str, seo_description: str, category: str, blocks: arr(blockSchema) });
export const generationSchema = obj({ document: obj({ schema_version: { type: 'number' }, name: str, tagline: str, footer: str, theme: obj({ primary: str, background: str, foreground: str, font: str, radius: str }), categories: arr(str), menu: arr(obj({ label: str, slug: str })), reusable: arr(blockSchema), pages: arr(pageSchema) }) });