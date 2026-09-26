import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BuilderTemplateSelect from '@/components/website/BuilderTemplateSelect';
import useWebsiteTemplates from '@/components/website/useWebsiteTemplates';
import { builderCall, builderError } from '@/components/website/builderClient';
import BuilderField from '@/components/website/BuilderField';
import { Button } from '@/components/ui/button';
export default function BuilderCreateSite({ companyId }) {
  const navigate = useNavigate();
  const catalog = useWebsiteTemplates();
  const [name, setName] = useState(''), [slug, setSlug] = useState(''), [path, setPath] = useState('template'), [template, setTemplate] = useState(() => new URLSearchParams(window.location.search).get('template') || 'field'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const validTemplate = ['field', 'local', 'consulting', 'startup'].includes(template) || catalog.data?.some(t => t.id === template);
  async function create(e) {
    e.preventDefault();
    if (path === 'template' && !validTemplate) { setError('Select an available template before creating a website.'); return; }
    setBusy(true); setError('');
    try { const r = await builderCall('create', { company_id: companyId, name, slug, template: path === 'ai' ? 'startup' : template }); navigate(`/WebsiteEditor/${r.site.id}${path === 'ai' ? '?ai=1' : ''}`); } catch (e) { setError(builderError(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={create} className="border bg-card rounded-xl p-6 space-y-4"><h2 className="text-xl font-semibold">Create your website</h2><p className="text-sm text-muted-foreground">For established businesses and new ventures. Both paths use the same visual editor and CMS; nothing is public until you publish the site.</p>
    <BuilderField label="Business / site name" value={name} onChange={setName} required maxLength={120} />
    <BuilderField label="Address prefix (lowercase letters, numbers, hyphens)" value={slug} onChange={setSlug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={70} />
    <p className="text-xs text-muted-foreground">A permanent unique suffix is added to prevent site-address collisions.</p>
    <BuilderField label="Creation path" value={path} onChange={setPath} options={[{ value: 'template', label: 'Customizable visual template' }, { value: 'ai', label: 'Guided advanced AI brief' }]} />
    {path === 'template' ? <><BuilderTemplateSelect value={template} onChange={setTemplate} /><Link to="/JobTemplates?section=websites" className="block text-sm text-primary underline">Browse and preview all 45 service templates</Link>{!catalog.isLoading && !validTemplate && <p className="text-sm text-destructive">Choose an available template from the list.</p>}</> : <p className="text-sm text-muted-foreground">Create a private starter, then complete your brief and preview the real AI proposal before applying. AI uses integration credits.</p>}
    <p className="text-xs text-muted-foreground">Templates contain labeled sample copy, not business claims or customer testimonials.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button disabled={busy || (path === 'template' && !validTemplate)}>{busy ? 'Creating…' : path === 'ai' ? 'Create draft & open AI brief' : 'Start with template'}</Button>
  </form>;
}