import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BuilderRenderer from '@/components/website/BuilderRenderer';
import { builderCall, builderError } from '@/components/website/builderClient';
export default function WebsiteTemplatePreview({ template, onClose }) {
  const [page, setPage] = useState('home');
  const { data, isLoading, error } = useQuery({ queryKey: ['website-template-preview', 'photo-v1', template.id], queryFn: () => builderCall('validate', { template: template.id }) });
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden"><DialogHeader><DialogTitle>{template.name}</DialogTitle></DialogHeader>
    <div className="flex items-center justify-between gap-3 flex-wrap"><p className="text-xs text-muted-foreground">AI-generated sample photos · Forms disabled · All content is editable</p><Button asChild><Link to={`/WebsiteBuilder?template=${encodeURIComponent(template.id)}`}>Use template</Link></Button></div>
    <div className="min-h-0 flex-1 overflow-auto border rounded-lg">{isLoading ? <p className="p-8">Loading preview…</p> : error ? <p role="alert" className="p-8 text-destructive">{builderError(error)}</p> : <BuilderRenderer document={data.document} assets={data.assets} pageId={data.document.pages.find(p => p.slug === page)?.id} preview onNavigate={setPage} />}</div>
  </DialogContent></Dialog>;
}