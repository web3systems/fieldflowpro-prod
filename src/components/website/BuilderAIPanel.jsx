import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { builderError } from '@/components/website/builderClient';
import BuilderField from '@/components/website/BuilderField';
import BuilderRenderer from '@/components/website/BuilderRenderer';
import { Button } from '@/components/ui/button';
const fields = [['business_type', 'Business type'], ['audience', 'Audience'], ['services', 'Services / offerings'], ['area', 'Service area'], ['goals', 'Website goals'], ['voice', 'Brand voice and style'], ['colors', 'Preferred colors'], ['pages', 'Desired pages and features']];
export default function BuilderAIPanel({ site, pageId, blockId, assets, onSave, onApply, onClose }) {
  const [brief, setBrief] = useState({}), [scope, setScope] = useState('site'), [candidate, setCandidate] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [previewPage, setPreviewPage] = useState(null);
  async function generate() {
    setBusy(true); setError(''); setCandidate(null);
    try { const saved = await onSave(); const r = await base44.functions.invoke('websiteGenerate', { site_id: site.id, draft_token: saved.draft_token, scope, page_id: pageId, block_id: blockId, brief }); if (r.data.error) throw new Error(r.data.error); setCandidate(r.data.document); setPreviewPage(r.data.document.pages[0].id); } catch (e) { setError(builderError(e)); } finally { setBusy(false); }
  }
  async function apply() { setBusy(true); setError(''); try { await onApply(candidate); onClose(); } catch (e) { setError(builderError(e)); } finally { setBusy(false); } }
  return <div className="fixed inset-0 z-[65] bg-background overflow-auto p-4 md:p-8" role="dialog" aria-modal="true" aria-label="Guided AI website draft"><div className="max-w-6xl mx-auto space-y-5"><div className="flex justify-between gap-4"><div><h2 className="text-2xl font-semibold">Guided AI website draft</h2><p className="text-sm text-muted-foreground">Uses AI integration credits; no unlimited allowance is included. One request per minute per site. Nothing changes until you apply.</p></div><Button variant="outline" disabled={busy} onClick={onClose}>Close</Button></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {!candidate ? <div className="max-w-2xl space-y-4"><BuilderField label="Change scope" value={scope} options={[{ value: 'site', label: 'Entire site' }, { value: 'page', label: 'Current page' }, ...(blockId ? [{ value: 'section', label: 'Selected section' }] : [])]} onChange={setScope} />
      <div className="grid md:grid-cols-2 gap-3">{fields.map(([key, label]) => <BuilderField key={key} label={label} value={brief[key] || ''} onChange={value => setBrief({ ...brief, [key]: value })} maxLength={400} disabled={busy} />)}</div>
      <label className="block text-sm">Advanced instructions<textarea className="block border rounded p-3 w-full min-h-32 bg-background" maxLength={2500} disabled={busy} value={brief.instructions || ''} onChange={e => setBrief({ ...brief, instructions: e.target.value })} placeholder="Describe your business, layout preferences and desired changes. Do not include passwords or private client data." /></label>
      <Button onClick={generate} disabled={busy || !Object.values(brief).some(v => v.trim())}>{busy ? 'Generating draft…' : 'Generate proposal'}</Button></div> : <><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={apply}>{busy ? 'Applying…' : 'Apply to draft & keep checkpoint'}</Button><Button disabled={busy} variant="outline" onClick={() => setCandidate(null)}>Discard proposal</Button><BuilderField label="Preview page" value={previewPage} options={candidate.pages.map(p => ({ label: p.title, value: p.id }))} onChange={setPreviewPage} /></div><BuilderRenderer document={candidate} pageId={previewPage} assets={assets} preview onNavigate={slug => setPreviewPage(candidate.pages.find(p => p.slug === slug)?.id)} /></>}
  </div></div>;
}