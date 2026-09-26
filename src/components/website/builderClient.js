import { base44 } from '@/api/base44Client';
export async function builderCall(action, data = {}) {
  const res = await base44.functions.invoke('websiteBuilder', { action, ...data });
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}
export const builderError = e => e?.response?.data?.error || e?.data?.error || e?.message || 'Unable to complete this request';
export const newBlock = (type = 'text') => ({ id: `block-${crypto.randomUUID()}`, type, title: 'New section', body: [{ text: 'Write your content here.', bold: false, italic: false, underline: false }], image_id: '', alt: '', button: '', href: '', layout: 'stack', spacing: 'normal', background: '#ffffff', foreground: '#172033' });
export const newPage = (kind, slug) => ({ id: `page-${crypto.randomUUID()}`, kind, title: kind === 'post' ? 'New post' : 'New page', slug, visible: false, seo_title: '', seo_description: '', category: '', blocks: [newBlock()] });
export function safeHref(href, base = '') {
  if (/^\/[a-z0-9-]+$/.test(href)) return base + href;
  if (/^#[a-z0-9-]+$/.test(href) || /^mailto:[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(href) || /^tel:\+?[0-9 ()-]+$/.test(href)) return href;
  try { const u = new URL(href); if (u.protocol === 'https:' && !u.username && !u.password) return u.href; } catch (_) { /* invalid */ }
  return undefined;
}