import BuilderSection from '@/components/website/BuilderSection';
import '@/components/website/website.css';
export default function BuilderRenderer({ document: doc, pageId, assets = {}, routeKey = '', editing = false, preview = false, selected, onSelect, onChange, onNavigate }) {
  const page = doc.pages.find(p => p.id === pageId) || doc.pages[0];
  const base = `/sites/${routeKey}`;
  const fonts = { sans: 'system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' };
  return <div className="wb-site min-h-full" onClick={e => { const link = e.target.closest('a'); const href = link?.getAttribute('href'); if (onNavigate && href?.startsWith(base + '/')) { e.preventDefault(); onNavigate(href.slice(base.length + 1)); } }} style={{ '--site-primary': doc.theme.primary, '--site-bg': doc.theme.background, '--site-fg': doc.theme.foreground, '--site-font': fonts[doc.theme.font], '--site-radius': { square: '0', soft: '.5rem', round: '1.5rem' }[doc.theme.radius] }}>
    <header className="wb-header"><div><div className="wb-brand">{doc.name}</div><p>{doc.tagline}</p></div><nav aria-label="Website navigation">{doc.menu.map((m, i) => <a key={i} href={`${base}/${m.slug}`} onClick={onNavigate ? e => { e.preventDefault(); onNavigate(m.slug); } : undefined}>{m.label}</a>)}</nav></header>
    <main>{page?.kind === 'post' && <div className="p-6"><h1 className="text-3xl font-bold">{page.title}</h1><p>{page.category}</p></div>}{page?.blocks.map(b => <BuilderSection key={b.id} block={b} base={base} assets={assets} routeKey={routeKey} editing={editing} preview={preview} selected={selected === b.id} onSelect={() => onSelect?.(b.id)} onChange={patch => onChange?.(b.id, patch)} />)}</main>
    <footer className="wb-footer">{doc.footer}</footer>
  </div>;
}