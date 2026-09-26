import { useState } from 'react';
import BuilderField from '@/components/website/BuilderField';
import useWebsiteTemplates from '@/components/website/useWebsiteTemplates';
import { builderError } from '@/components/website/builderClient';
const originals = [{ value: 'field', label: 'Field services — practical split layout' }, { value: 'local', label: 'Local services — centered introduction' }, { value: 'consulting', label: 'Consulting / freelance — editorial layout' }, { value: 'startup', label: 'New business / side hustle — landing site' }];
export default function BuilderTemplateSelect({ value, onChange }) {
  const { data = [], isLoading, error } = useWebsiteTemplates();
  const [filter, setFilter] = useState('all');
  const trades = [...new Map(data.map(t => [t.trade, t.business])).entries()];
  const options = [...(filter === 'all' || filter === 'general' ? originals : []), ...data.filter(t => filter === 'all' || t.trade === filter).map(t => ({ value: t.id, label: t.name }))];
  return <div className="space-y-3"><BuilderField label="Business type" value={filter} onChange={v => { setFilter(v); onChange(v === 'all' || v === 'general' ? 'field' : data.find(t => t.trade === v).id); }} options={[{ value: 'all', label: 'All templates' }, { value: 'general', label: 'General business' }, ...trades.map(([value, label]) => ({ value, label }))]} />
    {isLoading ? <p className="text-sm text-muted-foreground">Loading template choices…</p> : error ? <p role="alert" className="text-sm text-destructive">{builderError(error)}</p> : <BuilderField label="Template" value={value} onChange={onChange} options={options} />}
  </div>;
}