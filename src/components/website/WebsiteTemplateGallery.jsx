import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import useWebsiteTemplates from '@/components/website/useWebsiteTemplates';
import WebsiteTemplateCard from '@/components/website/WebsiteTemplateCard';
import WebsiteTemplatePreview from '@/components/website/WebsiteTemplatePreview';
import { builderError } from '@/components/website/builderClient';
export default function WebsiteTemplateGallery() {
  const { data: templates = [], isLoading, error, refetch } = useWebsiteTemplates();
  const [trade, setTrade] = useState('all'), [search, setSearch] = useState(''), [preview, setPreview] = useState(null);
  const trades = [...new Map(templates.map(t => [t.trade, t.business])).entries()];
  const filtered = templates.filter(t => (trade === 'all' || t.trade === trade) && `${t.name} ${t.description}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="max-w-6xl mx-auto p-4 md:p-6 pb-28 space-y-5">
    <header><h2 className="text-2xl font-semibold">Website Templates</h2><p className="text-muted-foreground mt-1">Five photo-led designs for each trade. Preview every page, then make it your own. Includes editable, AI-generated sample imagery.</p></header>
    <div className="flex flex-wrap gap-3"><Input className="sm:max-w-sm" aria-label="Search website templates" placeholder="Search website templates…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Business type" className="rounded-md border bg-background text-foreground px-3 py-2 text-sm" value={trade} onChange={e => setTrade(e.target.value)}><option value="all">All business types</option>{trades.map(([id, label]) => <option key={id} value={id}>{label} · 5 designs</option>)}</select></div>
    {isLoading ? <p className="py-12 text-muted-foreground">Loading website templates…</p> : error ? <div role="alert"><p className="text-destructive">{builderError(error)}</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div> : <><p className="text-sm text-muted-foreground">{filtered.length} of {templates.length} templates · {trades.length} service categories</p>{!filtered.length ? <p className="py-12 text-center text-muted-foreground">No templates match your search.</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map(t => <WebsiteTemplateCard key={t.id} template={t} onPreview={() => setPreview(t)} />)}</div>}</>}
    {preview && <WebsiteTemplatePreview key={preview.id} template={preview} onClose={() => setPreview(null)} />}
  </section>;
}