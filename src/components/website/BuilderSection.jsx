import BuilderRichText from '@/components/website/BuilderRichText';
import BuilderIntakeForm from '@/components/website/BuilderIntakeForm';
import { safeHref } from '@/components/website/builderClient';
export default function BuilderSection({ block, assets, base, routeKey, editing, preview, onChange, onSelect, selected }) {
  const Heading = block.type === 'hero' ? 'h1' : 'h2';
  return <section id={block.id} className={`wb-section ${block.layout} ${block.spacing} ${block.type === 'hero' && block.image_id && assets?.[block.image_id] ? 'wb-photo-hero' : ''} ${selected ? 'wb-selected' : ''}`} style={{ '--section-bg': block.background, '--section-fg': block.foreground }} onClick={editing ? onSelect : undefined}>
    <div>
      {editing ? <Heading className="wb-editable" contentEditable suppressContentEditableWarning onBlur={e => onChange({ title: e.currentTarget.textContent })} onPaste={e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }} onDrop={e => e.preventDefault()}>{block.title}</Heading> : <Heading>{block.title}</Heading>}
      {editing ? <BuilderRichText value={block.body} onChange={body => onChange({ body })} /> : <div className="wb-copy">{block.body.map((r, i) => <span key={i} style={{ fontWeight: r.bold ? 700 : undefined, fontStyle: r.italic ? 'italic' : undefined, textDecoration: r.underline ? 'underline' : undefined }}>{r.text}</span>)}</div>}
      {block.button && <a className="wb-cta" href={safeHref(block.href, base)} onClick={editing ? e => e.preventDefault() : undefined}>{block.button}</a>}
      {['contact', 'booking'].includes(block.type) && <BuilderIntakeForm key={`${routeKey}-${block.id}`} routeKey={routeKey} blockId={block.id} booking={block.type === 'booking'} preview={preview || editing} />}
    </div>
    {block.image_id && assets?.[block.image_id] && <img src={assets[block.image_id]} alt={block.alt} loading="lazy" />}
    {editing && block.type === 'image' && !block.image_id && <p className="border border-dashed p-8">Select this section, then choose an image.</p>}
  </section>;
}