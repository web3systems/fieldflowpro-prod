import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { builderError } from '@/components/website/builderClient';
import { Button } from '@/components/ui/button';
export default function BuilderMediaPicker({ companyId, onSelect, onClose }) {
  const [items, setItems] = useState([]), [busy, setBusy] = useState(true), [error, setError] = useState(''), [offset, setOffset] = useState(0), [more, setMore] = useState(false);
  useEffect(() => {
    let active = true;
    setBusy(true); setError('');
    base44.functions.invoke('websiteMedia', { action: 'list', company_id: companyId, offset }).then(r => { if (r.data.error) throw new Error(r.data.error); if (active) { setItems(r.data.media); setMore(r.data.has_more); } }).catch(e => active && setError(builderError(e))).finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [companyId, offset]);
  async function upload(file) {
    if (!file) return; setBusy(true); setError('');
    try { const r = await base44.functions.invoke('websiteMedia', { action: 'upload', company_id: companyId, file }); if (r.data.error) throw new Error(r.data.error); setItems(x => [r.data.media, ...x]); } catch (e) { setError(builderError(e)); } finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[70] bg-background/95 p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Website media library">
    <div className="max-w-3xl mx-auto space-y-4"><div className="flex justify-between"><h2 className="text-xl font-semibold">Company website media</h2><Button variant="outline" onClick={onClose}>Close</Button></div>
    <p className="text-sm text-muted-foreground">Uploads are private until included in a published site. Publish makes selected images publicly accessible; use only media you have permission to publish.</p>
    <label className="block">Upload image (JPG, PNG, WebP · up to 5 MB)<input className="block my-2" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => upload(e.target.files[0])} /></label>
    {error && <p role="alert" className="text-destructive">{error}</p>}{busy && <p>Loading media…</p>}
    {!busy && !items.length && <p>No website images uploaded yet.</p>}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{items.map(m => <button className="border rounded-lg p-2 text-left" key={m.id} onClick={() => { onSelect(m); onClose(); }}><img className="h-32 w-full object-cover rounded" src={m.url} alt={m.name} /><span className="text-xs break-all">{m.name}</span></button>)}</div>
    <div className="flex gap-2"><Button variant="outline" disabled={busy || !offset} onClick={() => setOffset(x => x - 24)}>Previous</Button><Button variant="outline" disabled={busy || !more} onClick={() => setOffset(x => x + 24)}>Next</Button></div></div>
  </div>;
}