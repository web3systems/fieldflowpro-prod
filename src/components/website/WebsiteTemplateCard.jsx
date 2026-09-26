import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import WebsiteTemplateThumbnail from '@/components/website/WebsiteTemplateThumbnail';
export default function WebsiteTemplateCard({ template: t, onPreview }) {
  return <article className="overflow-hidden rounded-xl border bg-card flex flex-col">
    <button type="button" onClick={onPreview} aria-label={`Preview ${t.name}`} className="text-left w-full border-b">
      <WebsiteTemplateThumbnail template={t} />
    </button>
    <div className="p-4 flex-1 flex flex-col gap-3"><h3 className="font-semibold">{t.name}</h3><p className="text-sm text-muted-foreground flex-1">{t.description}</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onPreview}>Preview</Button><Button asChild><Link to={`/WebsiteBuilder?template=${encodeURIComponent(t.id)}`}>Use template</Link></Button></div></div>
  </article>;
}