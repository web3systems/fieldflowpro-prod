import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import {
  ArrowLeft, Plus, Briefcase, User, Calendar, FileText,
  List, Tag, Clock, Trash2, X, Pencil, UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const defaultJob = {
  title: "", description: "", status: "new", priority: "medium",
  address: "", city: "", state: "", zip: "",
  scheduled_start: "", scheduled_end: "",
  customer_id: "", service_type: "", notes: "", internal_notes: "",
  line_items: [], tax_rate: 0, subtotal: 0, total_amount: 0,
  assigned_techs: [], checklist: [], tags: [],
};

export default function NewJob() {
  const navigate = useNavigate();
  const { activeCompany } = useApp();
  const [form, setForm] = useState(defaultJob);
  const [customers, setCustomers] = useState([]);
  const [techs, setTechs] = useState([]);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [openSection, setOpenSection] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  const [anytime, setAnytime] = useState(false);

  useEffect(() => {
    if (!activeCompany) return;
    Promise.all([
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
      base44.entities.Service.filter({ company_id: activeCompany.id, is_active: true }),
    ]).then(([c, t, s]) => {
      setCustomers(c);
      setTechs(t);
      setServices(s);
    });

    // Pre-fill schedule
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const pad = n => String(n).padStart(2, "0");
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setForm(f => ({ ...f, scheduled_start: fmt(now), scheduled_end: fmt(new Date(now.getTime() + 3600000)) }));

    // Pre-fill customer from URL param
    const customerId = new URLSearchParams(window.location.search).get("customer_id");
    if (customerId) setForm(f => ({ ...f, customer_id: customerId }));
  }, [activeCompany]);

  function addLineItem(type) {
    const items = [...(form.line_items || []), { type, description: "", quantity: 1, unit_price: 0, total: 0 }];
    recalcTotals(items);
  }

  function updateLineItem(idx, field, value) {
    const items = (form.line_items || []).map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "unit_price") {
        updated.total = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.unit_price) || 0);
      }
      return updated;
    });
    recalcTotals(items);
  }

  function removeLineItem(idx) {
    recalcTotals((form.line_items || []).filter((_, i) => i !== idx));
  }

  function recalcTotals(items) {
    const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const tax = subtotal * ((parseFloat(form.tax_rate) || 0) / 100);
    setForm(prev => ({ ...prev, line_items: items, subtotal, total_amount: subtotal + tax }));
  }

  function selectServiceForItem(idx, serviceId) {
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    const items = (form.line_items || []).map((item, i) => {
      if (i !== idx) return item;
      return { ...item, description: svc.name, unit_price: svc.unit_price || 0, total: (parseFloat(item.quantity) || 1) * (svc.unit_price || 0) };
    });
    recalcTotals(items);
  }

  const getCustomerName = (id) => {
    const c = customers.find(c => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "";
  };

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    const created = await base44.entities.Job.create({ ...form, company_id: activeCompany.id });
    setSaving(false);
    navigate(`/JobDetail/${created.id}`);
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/Jobs")} className="gap-1 text-slate-500">
            <ArrowLeft className="w-4 h-4" /> Jobs
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-800">New Job</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/Jobs")}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.title} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Creating..." : "Create Job"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
        {/* Left Sidebar */}
        <div className="w-full md:w-72 flex-shrink-0 bg-white border-r border-slate-200 p-4 space-y-4">

          {/* Title + Status */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Job Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Lawn Maintenance"
                className="bg-white"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer */}
          <div className="bg-slate-50 border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <UserCircle className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-sm text-slate-700">Customer</span>
            </div>
            <Input
              placeholder="Search by name, phone..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className="text-sm h-8 mb-2"
            />
            {customerSearch && (
              <div className="border rounded-md bg-white shadow-sm max-h-40 overflow-y-auto mb-2">
                {customers.filter(c =>
                  `${c.first_name} ${c.last_name} ${c.email} ${c.phone}`.toLowerCase().includes(customerSearch.toLowerCase())
                ).map(c => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 border-b last:border-b-0"
                    onClick={() => { setForm({ ...form, customer_id: c.id }); setCustomerSearch(`${c.first_name} ${c.last_name}`); }}
                  >
                    {c.first_name} {c.last_name}
                    {c.phone && <span className="text-slate-400 text-xs ml-1">· {c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
            {form.customer_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 font-medium">{getCustomerName(form.customer_id)}</span>
                <button onClick={() => { setForm({ ...form, customer_id: "" }); setCustomerSearch(""); }} className="text-slate-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <Link to="/Customers?new=1" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2">
              <Plus className="w-3 h-3" /> New customer
            </Link>
          </div>

          {/* Schedule */}
          <div className="bg-slate-50 border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-sm text-slate-700">Schedule</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-8 text-slate-500">From</span>
                <Input type="date" value={form.scheduled_start?.split("T")[0] || ""} onChange={e => setForm({ ...form, scheduled_start: e.target.value })} className="h-7 text-xs flex-1" />
                <Input type="time" value={form.scheduled_start?.split("T")[1]?.slice(0,5) || ""} onChange={e => setForm({ ...form, scheduled_start: (form.scheduled_start?.split("T")[0] || "") + "T" + e.target.value })} className="h-7 text-xs w-20" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 text-slate-500">To</span>
                <Input type="date" value={form.scheduled_end?.split("T")[0] || ""} onChange={e => setForm({ ...form, scheduled_end: e.target.value })} className="h-7 text-xs flex-1" />
                <Input type="time" value={form.scheduled_end?.split("T")[1]?.slice(0,5) || ""} onChange={e => setForm({ ...form, scheduled_end: (form.scheduled_end?.split("T")[0] || "") + "T" + e.target.value })} className="h-7 text-xs w-20" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="anytime" checked={anytime} onCheckedChange={setAnytime} />
                <label htmlFor="anytime" className="text-xs text-slate-600">Anytime</label>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="bg-slate-50 border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-sm text-slate-700">Assign Team</span>
            </div>
            <Select value={form.assigned_techs?.[0] || ""} onValueChange={v => setForm({ ...form, assigned_techs: [v] })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select technician" /></SelectTrigger>
              <SelectContent>
                {techs.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.assigned_techs?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.assigned_techs.map(tid => {
                  const t = techs.find(x => x.id === tid);
                  return t ? <Badge key={tid} variant="secondary" className="text-xs">{t.first_name} {t.last_name}</Badge> : null;
                })}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="bg-slate-50 border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-sm text-slate-700">Priority</span>
            </div>
            <Select value={form.priority || "medium"} onValueChange={v => setForm({ ...form, priority: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Main */}
        <div className="flex-1 p-4 md:p-6 space-y-5">

          {/* Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Private Notes</Label>
            <Textarea
              value={form.internal_notes || ""}
              onChange={e => setForm({ ...form, internal_notes: e.target.value })}
              placeholder="Internal notes about this job..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Fields */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Job Details</h3>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Job description..." className="text-sm resize-none mt-1" />
            </div>
            <div>
              <Label className="text-xs">Service Type</Label>
              <Input value={form.service_type || ""} onChange={e => setForm({ ...form, service_type: e.target.value })} placeholder="e.g. HVAC, Cleaning..." className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" className="h-8 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">City</Label><Input value={form.city || ""} onChange={e => setForm({ ...form, city: e.target.value })} className="h-8 text-sm mt-1" /></div>
              <div><Label className="text-xs">State</Label><Input value={form.state || ""} onChange={e => setForm({ ...form, state: e.target.value })} className="h-8 text-sm mt-1" maxLength={2} /></div>
              <div><Label className="text-xs">ZIP</Label><Input value={form.zip || ""} onChange={e => setForm({ ...form, zip: e.target.value })} className="h-8 text-sm mt-1" /></div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Line Items</h3>

            {/* Services */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Services</span>
              </div>
              {(form.line_items || []).filter(i => i.type === "service").map((item, idx) => {
                const realIdx = (form.line_items || []).indexOf(item);
                return (
                  <div key={realIdx} className="flex items-center gap-2 mb-2">
                    <Select value="" onValueChange={v => selectServiceForItem(realIdx, v)}>
                      <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder={item.description || "Select service"} /></SelectTrigger>
                      <SelectContent>
                        {services.filter(s => s.item_type === "service" || !s.item_type).map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.unit_price > 0 ? ` — $${s.unit_price.toFixed(2)}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" value={item.quantity} onChange={e => updateLineItem(realIdx, "quantity", e.target.value)} className="w-14 h-8 text-xs" placeholder="Qty" />
                    <Input type="number" value={item.unit_price} onChange={e => updateLineItem(realIdx, "unit_price", e.target.value)} className="w-20 h-8 text-xs" placeholder="Price" />
                    <span className="text-sm w-16 text-right">${(item.total || 0).toFixed(2)}</span>
                    <button onClick={() => removeLineItem(realIdx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })}
              <button onClick={() => addLineItem("service")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                <Plus className="w-3.5 h-3.5" /> Add service
              </button>
            </div>

            {/* Materials */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Materials</span>
              </div>
              {(form.line_items || []).filter(i => i.type === "material").map((item, idx) => {
                const realIdx = (form.line_items || []).indexOf(item);
                return (
                  <div key={realIdx} className="flex items-center gap-2 mb-2">
                    <Select value="" onValueChange={v => selectServiceForItem(realIdx, v)}>
                      <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder={item.description || "Select material"} /></SelectTrigger>
                      <SelectContent>
                        {services.filter(s => s.item_type === "material").map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.unit_price > 0 ? ` — $${s.unit_price.toFixed(2)}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" value={item.quantity} onChange={e => updateLineItem(realIdx, "quantity", e.target.value)} className="w-14 h-8 text-xs" placeholder="Qty" />
                    <Input type="number" value={item.unit_price} onChange={e => updateLineItem(realIdx, "unit_price", e.target.value)} className="w-20 h-8 text-xs" placeholder="Price" />
                    <span className="text-sm w-16 text-right">${(item.total || 0).toFixed(2)}</span>
                    <button onClick={() => removeLineItem(realIdx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })}
              <button onClick={() => addLineItem("material")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                <Plus className="w-3.5 h-3.5" /> Add material
              </button>
            </div>

            {/* Totals */}
            {(form.line_items || []).length > 0 && (
              <div className="border-t mt-3 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>${(form.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 text-base pt-1 border-t">
                  <span>Total</span>
                  <span>${(form.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><List className="w-4 h-4" /> Checklist</h3>
              <button onClick={() => setForm(f => ({ ...f, checklist: [...(f.checklist || []), { item: "", completed: false }] }))} className="text-blue-600 hover:text-blue-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {(form.checklist || []).length === 0 ? (
              <p className="text-xs text-slate-400">No checklist items yet</p>
            ) : (
              <div className="space-y-2">
                {(form.checklist || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Checkbox checked={item.completed || false} onCheckedChange={v => {
                      const cl = [...(form.checklist || [])]; cl[i] = { ...cl[i], completed: v }; setForm(f => ({ ...f, checklist: cl }));
                    }} />
                    <Input value={item.item} onChange={e => {
                      const cl = [...(form.checklist || [])]; cl[i] = { ...cl[i], item: e.target.value }; setForm(f => ({ ...f, checklist: cl }));
                    }} placeholder="Checklist item..." className="h-7 text-xs flex-1" />
                    <button onClick={() => setForm(f => ({ ...f, checklist: (f.checklist || []).filter((_, idx) => idx !== i) }))} className="text-slate-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Save */}
          <div className="flex gap-3 pb-8">
            <Button variant="outline" onClick={() => navigate("/Jobs")} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {saving ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}