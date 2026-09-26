import { useCallback, useEffect, useRef, useState } from 'react';
import { builderCall, builderError } from '@/components/website/builderClient';
export default function useBuilderDraft(siteId) {
  const [site, setSite] = useState(null), [document, setDocument] = useState(null), [assets, setAssets] = useState({});
  const [status, setStatus] = useState('Loading…'), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const current = useRef(null), draft = useRef(null), saved = useRef(''), pending = useRef(null), alive = useRef(true);
  const load = useCallback(async () => {
    setError(''); setStatus('Loading…');
    try { const result = await builderCall('load', { site_id: siteId }); if (!alive.current) return; current.current = result.site; draft.current = result.site.draft; saved.current = JSON.stringify(result.site.draft); setSite(result.site); setDocument(result.site.draft); setAssets(result.assets); setStatus('Saved'); }
    catch (e) { if (alive.current) { setError(builderError(e)); setStatus('Load failed'); } }
  }, [siteId]);
  useEffect(() => { alive.current = true; load(); return () => { alive.current = false; }; }, [load]);
  const change = useCallback(next => { const value = typeof next === 'function' ? next(draft.current) : next; draft.current = value; setDocument(value); setStatus('Unsaved changes'); setError(''); }, []);
  const save = useCallback(async () => {
    if (pending.current) await pending.current;
    if (!current.current || !draft.current) throw new Error('Draft is not loaded');
    const snapshot = draft.current, encoded = JSON.stringify(snapshot);
    if (encoded === saved.current) return current.current;
    setStatus('Saving…'); setError('');
    const task = builderCall('save', { site_id: siteId, draft_token: current.current.draft_token, document: snapshot });
    pending.current = task;
    try {
      const result = await task; current.current = result.site; saved.current = encoded;
      if (alive.current) { setSite(result.site); setStatus(JSON.stringify(draft.current) === encoded ? 'Saved' : 'Unsaved changes'); }
      return result.site;
    } catch (e) { if (alive.current) { setError(builderError(e)); setStatus('Not saved'); } throw e; }
    finally { if (pending.current === task) pending.current = null; }
  }, [siteId]);
  useEffect(() => { if (!document || JSON.stringify(document) === saved.current) return; const timer = setTimeout(() => { save().catch(() => {}); }, 1500); return () => clearTimeout(timer); }, [document, save]);
  useEffect(() => { const warn = e => { if (draft.current && JSON.stringify(draft.current) !== saved.current) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, []);
  async function action(name, data = {}) {
    setBusy(true); setError('');
    try {
      await save();
      const result = await builderCall(name, { site_id: siteId, draft_token: current.current.draft_token, ...data });
      if (result.site) { current.current = result.site; setSite(result.site); }
      if (['restore', 'applyAI'].includes(name)) await load();
      return result;
    } catch (e) { setError(builderError(e)); throw e; } finally { setBusy(false); }
  }
  return { site, document, change, assets, setAssets, status, error, busy, setBusy, load, save, action };
}