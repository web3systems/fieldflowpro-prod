import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BuilderRenderer from '@/components/website/BuilderRenderer';
import BuilderCMS from '@/components/website/BuilderCMS';
import BuilderLibrary from '@/components/website/BuilderLibrary';
import BuilderInspector from '@/components/website/BuilderInspector';
import BuilderSiteSettings from '@/components/website/BuilderSiteSettings';
import BuilderRevisions from '@/components/website/BuilderRevisions';
import BuilderAIPanel from '@/components/website/BuilderAIPanel';
import BuilderField from '@/components/website/BuilderField';
import useBuilderDraft from '@/components/website/useBuilderDraft';
import { newBlock } from '@/components/website/builderClient';
export default function BuilderWorkspace({ siteId }) {
  const state = useBuilderDraft(siteId), { site, document: doc, change, status, error, busy, assets, setAssets, action, save, load } = state;
  const [pageId, setPageId] = useState(null), [selected, setSelected] = useState(null), [tab, setTab] = useState('pages'), [width, setWidth] = useState('desktop'), [preview, setPreview] = useState(false), [ai, setAI] = useState(new URLSearchParams(window.location.search).get('ai') === '1');
  if (!doc) return <div className="p-8"><p>{error || status}</p><Button variant="outline" onClick={load}>Retry loading</Button><Link className="ml-4 underline" to="/WebsiteBuilder">Back to websites</Link></div>;
  const page = doc.pages.find(p => p.id === pageId) || doc.pages[0], block = page.blocks.find(b => b.id === selected);
  const updateBlocks = blocks => change({ ...doc, pages: doc.pages.map(p => p.id === page.id ? { ...p, blocks } : p) });
  const patch = (id, values) => updateBlocks(page.blocks.map(b => b.id === id ? { ...b, ...values } : b));
  const selectPage = id => { setPageId(id); setSelected(null); };
  function add(type) { const b = newBlock(type); updateBlocks([...page.blocks, b]); setSelected(b.id); setTab('section'); }
  function move(delta) { const a = [...page.blocks], i = a.findIndex(b => b.id === selected), j = i + delta; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; updateBlocks(a); }
  const run = (name, data) => action(name, data).catch(() => {});
  return <div className="p-3 md:p-6 pb-28 space-y-4">
    <div className="flex flex-wrap items-center gap-3"><Link to="/WebsiteBuilder" className="text-primary underline" onClick={e => { if (status !== 'Saved' && !window.confirm('Leave this editor? Unsaved changes may be lost.')) e.preventDefault(); }}>Websites</Link><h1 className="text-xl font-semibold flex-1">{doc.name}</h1><span role="status" className="text-sm text-muted-foreground">{status}</span><Button variant="outline" disabled={busy} onClick={() => save().catch(() => {})}>Save draft</Button><Button variant="outline" disabled={busy} onClick={() => setAI(true)}>AI assistant</Button><Button disabled={busy} onClick={() => { if (window.confirm('Publish selected pages and posts at the FFP site address? Selected media becomes public. Custom domains remain blocked.')) run('publish', { confirm_public: true }); }}>{busy ? 'Working…' : 'Publish site'}</Button></div>
    <p className="text-xs text-muted-foreground">Draft edits never change the live site until Publish site. Custom-domain launch is blocked. Pricing and plan allowances have not been finalized.</p>
    {error && <div role="alert" className="text-destructive border p-3">{error} <Button variant="outline" onClick={() => { if (window.confirm('Reload the last saved draft and discard local changes?')) load(); }}>Reload saved draft</Button></div>}
    {site.published_revision_id && <div className="flex flex-wrap gap-4 text-sm"><a className="text-primary underline" href={`/sites/${site.route_key}/home`} target="_blank" rel="noopener noreferrer">View published FFP-hosted site</a><button className="text-destructive" disabled={busy} onClick={() => { if (window.confirm('Take the FFP-hosted site offline? Previously published media URLs cannot be revoked here.')) run('unpublish'); }}>Unpublish site</button></div>}
    <fieldset disabled={busy || ai} className="min-w-0"><div className="grid xl:grid-cols-[19rem_minmax(0,1fr)] gap-4">
      <aside className="bg-card border rounded-xl p-4 space-y-4"><BuilderField label="CMS panel" value={tab} options={['pages', 'section', 'library', 'site', 'revisions']} onChange={setTab} />
        {tab === 'pages' && <BuilderCMS doc={doc} page={page} onChange={change} onSelect={selectPage} />}
        {tab === 'section' && <BuilderInspector block={block} companyId={site.company_id} onChange={values => patch(selected, values)} onAsset={m => setAssets(x => ({ ...x, [m.id]: m.url }))} onMove={move} onRemove={() => { updateBlocks(page.blocks.filter(b => b.id !== selected)); setSelected(null); }} onReuse={() => change({ ...doc, reusable: [...doc.reusable, { ...block, id: `saved-${crypto.randomUUID()}` }] })} />}
        {tab === 'library' && <BuilderLibrary doc={doc} onChange={change} companyId={site.company_id} onAsset={m => setAssets(x => ({ ...x, [m.id]: m.url }))} />}
        {tab === 'site' && <BuilderSiteSettings doc={doc} onChange={change} site={site} onDomain={hostname => run('domain', { hostname })} />}
        {tab === 'revisions' && <BuilderRevisions siteId={siteId} onRestore={revision_id => action('restore', { revision_id })} onCheckpoint={() => action('checkpoint')} />}
      </aside>
      <div className="min-w-0 space-y-3"><div className="flex flex-wrap gap-2 items-end"><BuilderField label="Canvas" value={width} options={['desktop', 'tablet', 'mobile']} onChange={setWidth} /><Button variant="outline" onClick={() => setPreview(!preview)}>{preview ? 'Return to editing' : 'Preview draft'}</Button><BuilderField label="Page" value={page.id} options={doc.pages.map(p => ({ value: p.id, label: p.title }))} onChange={selectPage} /></div>
        {!preview && <div className="flex flex-wrap gap-2">{['hero', 'text', 'image', 'cta', 'contact', 'booking'].map(type => <Button key={type} size="sm" variant="outline" onClick={() => add(type)}>+ {type}</Button>)}<select aria-label="Insert reusable section" className="border rounded bg-background text-sm p-2" value="" onChange={e => { const b = doc.reusable.find(x => x.id === e.target.value); if (b) updateBlocks([...page.blocks, { ...b, id: `block-${crypto.randomUUID()}` }]); }}><option value="">Insert reusable section…</option>{doc.reusable.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></div>}
        <div className="border rounded-xl overflow-hidden mx-auto" style={{ width: width === 'mobile' ? 390 : width === 'tablet' ? 768 : '100%', maxWidth: '100%' }}><BuilderRenderer document={doc} pageId={page.id} assets={assets} routeKey={site.route_key} editing={!preview && !busy && !ai} preview selected={selected} onSelect={id => { setSelected(id); setTab('section'); }} onChange={patch} onNavigate={slug => selectPage(doc.pages.find(p => p.slug === slug)?.id)} /></div>
      </div>
    </div></fieldset>
    {ai && <BuilderAIPanel site={site} pageId={page.id} blockId={selected} assets={assets} onSave={save} onApply={document => action('applyAI', { document })} onClose={() => setAI(false)} />}
  </div>;
}