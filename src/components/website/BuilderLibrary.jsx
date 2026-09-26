import { useState } from 'react';
import BuilderField from '@/components/website/BuilderField';
import BuilderInspector from '@/components/website/BuilderInspector';
import BuilderRichText from '@/components/website/BuilderRichText';
export default function BuilderLibrary({ doc, onChange, companyId, onAsset }) {
  const [selected, setSelected] = useState('');
  const block = doc.reusable.find(b => b.id === selected) || doc.reusable[0];
  const update = reusable => onChange({ ...doc, reusable });
  const patch = values => update(doc.reusable.map(b => b.id === block.id ? { ...b, ...values } : b));
  if (!block) return <p className="text-sm text-muted-foreground">No saved sections yet. Select a canvas section and choose Save reusable section.</p>;
  function move(delta) { const a = [...doc.reusable], i = a.findIndex(b => b.id === block.id), j = i + delta; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; update(a); }
  return <div className="space-y-4"><h3 className="font-semibold">Reusable section library</h3><p className="text-xs text-muted-foreground">Insert reusable sections as independent copies. Editing the library does not silently change existing pages.</p><BuilderField label="Saved section" value={block.id} options={doc.reusable.map(b => ({ value: b.id, label: b.title }))} onChange={setSelected} /><BuilderRichText value={block.body} onChange={body => patch({ body })} /><BuilderInspector block={block} companyId={companyId} onAsset={onAsset} onChange={patch} onMove={move} onRemove={() => update(doc.reusable.filter(b => b.id !== block.id))} onReuse={() => update([...doc.reusable, { ...block, id: `saved-${crypto.randomUUID()}` }])} /></div>;
}