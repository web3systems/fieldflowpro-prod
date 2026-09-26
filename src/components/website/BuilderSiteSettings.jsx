import { useState } from 'react';
import BuilderField from '@/components/website/BuilderField';
import { Button } from '@/components/ui/button';
export default function BuilderSiteSettings({ doc, onChange, site, onDomain }) {
  const [host, setHost] = useState(site.requested_domain || '');
  const patch = values => onChange({ ...doc, ...values });
  const theme = values => patch({ theme: { ...doc.theme, ...values } });
  function move(index, delta) { const menu = [...doc.menu], target = index + delta; if (target < 0 || target >= menu.length) return; [menu[index], menu[target]] = [menu[target], menu[index]]; patch({ menu }); }
  return <div className="space-y-3">
    <h3 className="font-semibold">Brand, navigation & footer</h3>
    <BuilderField label="Website name" value={doc.name} onChange={name => patch({ name })} />
    <BuilderField label="Header tagline" value={doc.tagline} onChange={tagline => patch({ tagline })} />
    <BuilderField label="Footer text" value={doc.footer} onChange={footer => patch({ footer })} />
    {['primary', 'background', 'foreground'].map(key => <BuilderField key={key} label={`Theme ${key}`} type="color" value={doc.theme[key]} onChange={value => theme({ [key]: value })} />)}
    <BuilderField label="Typography" options={['sans', 'serif', 'mono']} value={doc.theme.font} onChange={font => theme({ font })} />
    <BuilderField label="Corners" options={['square', 'soft', 'round']} value={doc.theme.radius} onChange={radius => theme({ radius })} />
    <h4 className="font-medium">Navigation menu</h4>
    {doc.menu.map((m, i) => <div className="border rounded p-2 space-y-2" key={i}><BuilderField label="Link label" value={m.label} onChange={label => patch({ menu: doc.menu.map((x, n) => n === i ? { ...x, label } : x) })} /><BuilderField label="Destination" value={m.slug} options={doc.pages.map(p => ({ value: p.slug, label: p.title }))} onChange={slug => patch({ menu: doc.menu.map((x, n) => n === i ? { ...x, slug } : x) })} /><div className="flex gap-3 text-xs"><button onClick={() => move(i, -1)}>Up</button><button onClick={() => move(i, 1)}>Down</button><button onClick={() => patch({ menu: doc.menu.filter((_, n) => n !== i) })}>Remove</button></div></div>)}
    <Button variant="outline" onClick={() => patch({ menu: [...doc.menu, { label: doc.pages[0].title, slug: doc.pages[0].slug }] })}>Add menu link</Button>
    <div className="border rounded p-3 space-y-3"><h4 className="font-semibold">Custom domain — BLOCKED</h4><p className="text-xs text-muted-foreground">Saved as pending only. Tenant-specific hostname routing, ownership checks and site mapping are not verified; no DNS, SSL or hosting changes are performed.</p><BuilderField label="Requested domain" value={host} onChange={setHost} placeholder="www.yourbusiness.com" /><Button variant="outline" onClick={() => onDomain(host)}>Save pending domain</Button></div>
  </div>;
}