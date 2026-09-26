import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/Layout';
import { Button } from '@/components/ui/button';
import BuilderCreateSite from '@/components/website/BuilderCreateSite';
import { builderCall, builderError } from '@/components/website/builderClient';
export default function WebsiteBuilder() {
  const { activeCompany, companiesLoading } = useApp();
  const [sites, setSites] = useState([]), [busy, setBusy] = useState(true), [error, setError] = useState(''), [offset, setOffset] = useState(0), [more, setMore] = useState(false);
  useEffect(() => { setOffset(0); }, [activeCompany?.id]);
  useEffect(() => {
    if (!activeCompany?.id) return; let active = true; setBusy(true); setError(''); setSites([]);
    builderCall('list', { company_id: activeCompany.id, offset }).then(r => { if (active) { setSites(r.sites); setMore(r.has_more); } }).catch(e => active && setError(builderError(e))).finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [activeCompany?.id, offset]);
  if (companiesLoading) return <div className="p-8">Loading company…</div>;
  if (!activeCompany) return <div className="p-8">Select a company before opening Website Builder.</div>;
  return <div className="p-4 md:p-8 pb-28 max-w-6xl mx-auto space-y-6"><header><h1 className="text-3xl font-semibold">Website Builder</h1><p className="text-muted-foreground mt-2">{activeCompany.name} · One visual editor for templates, AI drafts, pages and posts.</p></header>
    <div className="rounded-xl border bg-muted p-4 text-sm"><strong>Custom-domain launch is blocked.</strong> FFP-hosted site routes are available after explicit site publication. Domain requests stay pending until ownership and tenant routing are verified. No billing changes or unlimited AI allowance.</div>
    {error ? <p className="text-destructive" role="alert">{error}</p> : busy ? <p>Loading websites…</p> : <div className="grid lg:grid-cols-2 gap-6"><div className="space-y-4"><h2 className="text-lg font-semibold">Your websites</h2>{!sites.length && <p className="text-muted-foreground">No websites yet. Start from a template or an AI brief.</p>}{sites.map(s => <Link key={s.id} to={`/WebsiteEditor/${s.id}`} className="block bg-card border rounded-xl p-5 hover:border-primary"><h3 className="font-semibold">{s.name}</h3><p className="text-sm text-muted-foreground">{s.published ? 'Published snapshot + separate draft' : 'Private draft'}</p><span className="text-sm text-primary">Open visual editor</span></Link>)}<div className="flex gap-2"><Button variant="outline" disabled={!offset} onClick={() => setOffset(x => x - 20)}>Previous</Button><Button variant="outline" disabled={!more} onClick={() => setOffset(x => x + 20)}>Next</Button></div></div><BuilderCreateSite key={activeCompany.id} companyId={activeCompany.id} /></div>}
  </div>;
}