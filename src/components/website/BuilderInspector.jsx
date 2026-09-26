import { useState } from 'react';
import { Button } from '@/components/ui/button';
import BuilderField from '@/components/website/BuilderField';
import BuilderMediaPicker from '@/components/website/BuilderMediaPicker';
export default function BuilderInspector({ block, companyId, onChange, onAsset, onMove, onRemove, onReuse }) {
  const [picker, setPicker] = useState(false);
  if (!block) return <p className="text-sm text-muted-foreground">Select a section on the canvas to change its layout, image, colors and links.</p>;
  return <div className="space-y-3">
    <h3 className="font-semibold">Section settings</h3>
    <BuilderField label="Section title" value={block.title} onChange={title => onChange({ title })} />
    <BuilderField label="Layout" value={block.layout} options={['stack', 'split', 'center']} onChange={layout => onChange({ layout })} />
    <BuilderField label="Spacing" value={block.spacing} options={['compact', 'normal', 'roomy']} onChange={spacing => onChange({ spacing })} />
    <BuilderField label="Background" type="color" value={block.background} onChange={background => onChange({ background })} />
    <BuilderField label="Text color" type="color" value={block.foreground} onChange={foreground => onChange({ foreground })} />
    <BuilderField label="Button label" value={block.button} onChange={button => onChange({ button })} />
    <BuilderField label="Link (https://, /page-slug, mailto: or tel:)" value={block.href} onChange={href => onChange({ href })} />
    <BuilderField label="Image description / alt text" value={block.alt} onChange={alt => onChange({ alt })} />
    <Button variant="outline" onClick={() => setPicker(true)}>Choose image</Button>
    {block.image_id && <Button variant="ghost" onClick={() => onChange({ image_id: '', alt: '' })}>Remove image</Button>}
    <div className="flex gap-2"><Button variant="outline" onClick={() => onMove(-1)}>Move up</Button><Button variant="outline" onClick={() => onMove(1)}>Move down</Button></div>
    <Button variant="outline" onClick={onReuse}>Save reusable section</Button>
    <Button variant="destructive" onClick={onRemove}>Remove section</Button>
    {picker && <BuilderMediaPicker companyId={companyId} onClose={() => setPicker(false)} onSelect={m => { onAsset(m); onChange({ image_id: m.id, alt: m.name }); }} />}
  </div>;
}