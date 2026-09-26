import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BuilderRenderer from '@/components/website/BuilderRenderer';
export default function ClientWebsite() {
  const { routeKey, pageSlug = 'home' } = useParams(), navigate = useNavigate();
  const [result, setResult] = useState(null), [error, setError] = useState('');
  useEffect(() => { let active = true; setResult(null); setError(''); base44.functions.invoke('websitePublic', { route_key: routeKey }).then(r => { if (r.data.error) throw new Error(r.data.error); if (active) setResult(r.data); }).catch(() => active && setError('Published site unavailable.')).finally(() => {}); return () => { active = false; }; }, [routeKey]);
  const page = result?.document.pages.find(p => p.slug === pageSlug);
  useEffect(() => {
    if (!page || !result) return;
    const previous = document.title, oldMeta = document.querySelector('meta[name="description"]'), oldContent = oldMeta?.content;
    const meta = oldMeta || document.createElement('meta'); meta.name = 'description'; meta.content = page.seo_description || ''; if (!oldMeta) document.head.appendChild(meta);
    document.title = page.seo_title || `${page.title} — ${result.document.name}`;
    return () => { document.title = previous; if (oldMeta) meta.content = oldContent; else meta.remove(); };
  }, [page, result]);
  if (error) return <main className="p-10 text-center" role="alert">{error}</main>;
  if (!result) return <main className="p-10 text-center">Loading website…</main>;
  if (!page) return <main className="p-10 text-center">Page not found. <a className="underline" href={`/sites/${routeKey}/home`}>Return home</a></main>;
  return <BuilderRenderer document={result.document} assets={result.assets} routeKey={routeKey} pageId={page.id} onNavigate={slug => navigate(`/sites/${routeKey}/${slug}`)} />;
}