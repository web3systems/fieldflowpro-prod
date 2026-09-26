import { useState } from 'react';
import { Button } from '@/components/ui/button';
import BuilderField from '@/components/website/BuilderField';
import { newPage } from '@/components/website/builderClient';
export default function BuilderCMS({ doc, page, onChange, onSelect }) {
  const [category, setCategory] = useState('');
  const patch = update => onChange({ ...doc, pages: doc.pages.map(p => p.id === page.id ? { ...p, ...update } : p) });
  function add(kind) { let n = 1; while (doc.pages.some(p => p.slug === `${kind}-${n}`)) n++; const p = newPage(kind, `${kind}-${n}`); onChange({ ...doc, pages: [...doc.pages, p] }); onSelect(p.id); }
  function remove() { if (page.slug === 'home' || !window.confirm('Remove this item from the draft? Published content stays unchanged until you publish.')) return; onChange({ ...doc, pages: doc.pages.filter(p => p.id !== page.id), menu: doc.menu.filter(m => m.slug !== page.slug) }); onSelect(doc.pages.find(p => p.id !== page.id).id); }
  return <div className="space-y-3">
    <h3 className="font-semibold">Pages & posts</h3>
    <BuilderField label="Editing" value={page.id} options={doc.pages.map(p => ({ value: p.id, label: `${p.kind === 'post' ? 'Post: ' : ''}${p.title}${p.visible ? '' : ' (draft only)'}` }))} onChange={onSelect} />
    <div className="flex gap-2"><Button variant="outline" onClick={() => add('page')}>Add page</Button><Button variant="outline" onClick={() => add('post')}>Add post</Button></div>
    <BuilderField label="Title" value={page.title} onChange={title => patch({ title })} />
    <BuilderField label="Slug (unique across pages and posts)" disabled={page.slug === 'home'} value={page.slug} onChange={slug => { const menu = doc.menu.map(m => m.slug === page.slug ? { ...m, slug } : m); onChange({ ...doc, menu, pages: doc.pages.map(p => p.id === page.id ? { ...p, slug } : p) }); }} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={page.slug === 'home'} checked={page.visible} onChange={e => patch({ visible: e.target.checked })} /> Include in next publication</label>
    <BuilderField label="SEO title" value={page.seo_title} onChange={seo_title => patch({ seo_title })} maxLength={160} />
    <BuilderField label="SEO description" value={page.seo_description} onChange={seo_description => patch({ seo_description })} maxLength={320} />
    {page.kind === 'post' && <BuilderField label="Category" value={page.category} options={[{ value: '', label: 'Uncategorized' }, ...doc.categories]} onChange={category => patch({ category })} />}
    <BuilderField label="New category" value={category} onChange={setCategory} />
    <Button variant="outline" disabled={!category.trim() || doc.categories.includes(category.trim())} onClick={() => { onChange({ ...doc, categories: [...doc.categories, category.trim()] }); setCategory(''); }}>Add category</Button>
    <div className="flex flex-wrap gap-2">{doc.categories.map(c => <button className="text-xs border rounded p-1" key={c} title="Remove category" onClick={() => onChange({ ...doc, categories: doc.categories.filter(x => x !== c), pages: doc.pages.map(p => p.category === c ? { ...p, category: '' } : p) })}>{c} ×</button>)}</div>
    {page.slug !== 'home' && <Button variant="destructive" onClick={remove}>Remove {page.kind}</Button>}
  </div>;
}