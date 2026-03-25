import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Phone, Mail, Edit2, Save, X, ExternalLink, Tag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "on_hold", label: "On Hold" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function JobSidebar({ job, form, setForm, customers, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const customer = customers.find(c => c.id === form.customer_id);
  const fullAddress = [form.address, form.city, form.state, form.zip].filter(Boolean).join(", ");

  async function handleSave() {
    await onSave();
    setEditing(false);
  }

  function addTag(e) {
    e.preventDefault();
    if (!tagInput.trim()) return;
    const tags = form.tags || [];
    if (!tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...tags, tagInput.trim()] }));
    }
    setTagInput("");
  }

  function removeTag(tag) {
    setForm(f => ({ ...f, tags: (f.tags || []).filter(t => t !== tag) }));
  }

  return (
    <div className="w-64 flex-shrink-0 space-y-0 hidden lg:block">
      {/* Customer Info */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">
            {customer ? `${customer.first_name} ${customer.last_name}` : "No Customer"}
          </h3>
          <button onClick={() => setEditing(!editing)} className="text-slate-400 hover:text-blue-600">
            {editing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {editing ? (
          <div className="p-4 space-y-3">
            <div>
              <Label className="text-xs">Customer</Label>
              <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Street</Label>
              <Input value={form.address || ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div>
                <Label className="text-xs">City</Label>
                <Input value={form.city || ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input value={form.state || ""} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} maxLength={2} className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">ZIP</Label>
              <Input value={form.zip || ""} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Total Amount ($)</Label>
              <Input type="number" value={form.total_amount || ""} onChange={e => setForm(f => ({ ...f, total_amount: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_recurring" checked={form.is_recurring || false} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="rounded" />
              <Label htmlFor="is_recurring" className="text-xs cursor-pointer">Recurring Job</Label>
            </div>
            {form.is_recurring && (
              <div>
                <Label className="text-xs">Repeat Every</Label>
                <Select value={form.recurrence_interval || "monthly"} onValueChange={v => setForm(f => ({ ...f, recurrence_interval: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving} className="w-full gap-1 bg-blue-600 hover:bg-blue-700">
              <Save className="w-3 h-3" />{saving ? "Saving..." : "Save"}
            </Button>
          </div>
        ) : (
          <div>
            {customer && (
              <div className="p-4 border-b border-slate-100 space-y-2">
                {customer.address && (
                  <p className="text-xs text-slate-600">{customer.address}<br />{customer.city}, {customer.state} {customer.zip}</p>
                )}
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                    <Phone className="w-3 h-3" />{customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                    <Mail className="w-3 h-3" />{customer.email}
                  </a>
                )}
                <Link to={`/CustomerDetail/${customer.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  Customer profile <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Map */}
            {fullAddress && (
              <div className="border-b border-slate-100">
                <iframe
                  width="100%"
                  height="160"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
                />
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 text-xs text-blue-600 py-2 hover:underline"
                >
                  <MapPin className="w-3 h-3" /> {form.address}
                </a>
              </div>
            )}

            {/* Service address (if different from customer) */}
            {fullAddress && (
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Service Address</p>
                <p className="text-xs text-slate-600">{fullAddress}</p>
              </div>
            )}
          </div>
        )}

        {/* Job Tags */}
        <div className="p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1 mb-2">
            <Tag className="w-3 h-3" /> Job tags
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {(form.tags || []).map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
          <form onSubmit={addTag} className="flex gap-1">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="Add tag..."
              className="h-7 text-xs"
            />
            <Button type="submit" size="sm" variant="outline" className="h-7 px-2">
              <Plus className="w-3 h-3" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}