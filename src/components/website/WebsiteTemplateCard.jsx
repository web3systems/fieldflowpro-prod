import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
export default function WebsiteTemplateCard({ template: t, onPreview }) {
  return <article className="overflow-hidden rounded-xl border bg-card flex flex-col">
    <button type="button" onClick={onPreview} aria-label={`Preview ${t.name}`} className="text-left w-full border-b">
      <div className="h-56 p-5 overflow-hidden" style={{ background: t.background, color: t.foreground, fontFamily: { sans: 'system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' }[t.font] }}>
        <div className="flex items-center justify-between text-[10px] border-b pb-2 opacity-70"><strong>{t.business}</strong><span>Services · About · Contact</span></div>
        <div className={`py-5 ${t.layout === 'center' ? 'text-center' : ''}`}><p className="text-[9px] uppercase tracking-widest mb-2">{t.business} services</p><h3 className="text-xl leading-tight font-semibold max-w-64 mx-auto">{t.headline}</h3><span className="inline-block mt-3 rounded px-3 py-1 text-[9px]" style={{ background: t.primary, color: t.background }}>Explore services</span></div>
        <div className="grid grid-cols-2 gap-2">{t.sections.slice(1, 3).map(s => <span key={s} className="border rounded p-2 text-[9px] opacity-70">{s}</span>)}</div>
      </div>
    </button>
    <div className="p-4 flex-1 flex flex-col gap-3"><h3 className="font-semibold">{t.name}</h3><p className="text-sm text-muted-foreground flex-1">{t.description}</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onPreview}>Preview</Button><Button asChild><Link to={`/WebsiteBuilder?template=${encodeURIComponent(t.id)}`}>Use template</Link></Button></div></div>
  </article>;
}