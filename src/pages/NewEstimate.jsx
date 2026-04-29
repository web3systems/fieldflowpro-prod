import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import {
  ArrowLeft, Plus, FileText, X, Phone, Mail, MapPin,
  ExternalLink, Calendar, Users, ListChecks, UserCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LineItemRow from "@/components/services/LineItemRow";

const defaultItem = { description: "", quantity: 1, unit_price: 0, total: 0, service_id: null };
const defaultForm = {
  title: "", customer_id: "", status: "draft",
  line_items: [{ ...defaultItem }], subtotal: 0, tax_rate: 0,
  tax_amount: 0, discount: 0, total: 0,
  notes: "", valid_until: "", assigned_techs: [], checklist: [],
};

export default function NewEstimate() {
  const navigate = useNavigate();
  const { activeCompany } = useApp();
  const [form, setForm] = useState(defaultForm);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: "", last_name: "", phone: "", email: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);

  useEffect(() => {
    if (!activeCompany) return;
    Promise.all([
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
      base44.entities.Service.filter({ company_id: activeCompany.id, is_active: true }),
      base44.entities.Estimate.filter({ company_id: activeCompany.id }),
    ]).then(([c, t, s, ests]) => {
      setCustomers(c);
      setTechnicians(t);
      setServices(s);
      const num = `EST-${String(ests.length + 1).padStart(4, "0")}`;
      const tax_rate = activeCompany?.default_tax_rate || 0;
      setForm(f => ({ ...f, estimate_number: num, tax_rate }));
    });

    const customerId = new URLSearchParams(window.location.search).get("customer_id");
    if (customerId) setForm(f => ({ ...f, customer_id: customerId }));
  }, [activeCompany]);

  function updateItem(index, field, value) {
    const items = [...form.line_items];
    if (field === null && typeof value === "object") {
      items[index] = value;
    } else {
      items[index] = { ...items[index], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
      }
    }
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total: subtotal + tax_amount - (form.discount || 0) });
  }

  function removeItem(index) {
    const items = form.line_items.filter((_, i) => i !== index);
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total: subtotal + tax_amount - (form.discount || 0) });
  }

  async function handleCreateNewCustomer() {
    if (!newCustomer.first_name || !newCustomer.last_name) return;
    setSavingCustomer(true);
    const created = await base44.entities.Customer.create({ ...newCustomer, company_id: activeCompany.id, status: "active" });
    setCustomers(prev => [...prev, created]);
    setForm(f => ({ ...f, customer_id: created.id }));
    setShowNewCustomer(false);
    setNewCustomer({ first_name: "", last_name: "", phone: "", email: "" });
    setSavingCustomer(false);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    const created = await base44.entities.Estimate.create({ ...form, company_id: activeCompany.id });
    setSaving(false);
    navigate(`/EstimateDetail/${created.id}`);
  }

  const selectedCustomer = customers.find(c => c.id === form.customer_id);
  const address = selectedCustomer ? [selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip].filter(Boolean).join(", ") : "";
  const mapsQuery = encodeURIComponent(address);

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/Estimates")} className="gap-1 text-slate-500">
            <ArrowLeft className="w-4 h-4" /> Estimates
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-800">New Estimate</span>
              {form.estimate_number && <span className="text-xs text-slate-400 font-mono ml-2">{form.estimate_number}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/Estimates")}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.title} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Creating..." : "Create Estimate"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col md:flex-row flex-1 max-w-7xl mx-auto w-full">
        {/* Left Sidebar */}
        <div className="w-full md:w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">

          {/* Customer */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</Label>
              {form.customer_id && (
                <button onClick={() => setForm({ ...form, customer_id: "" })} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-0.5">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            <Select value={form.customer_id} onValueChange={v => { setForm({ ...form, customer_id: v }); setShowNewCustomer(false); }}>
              <SelectTrigger className="bg-white text-sm"><SelectValue placeholder="Select customer..." /></SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!showNewCustomer && (
              <button onClick={() => setShowNewCustomer(true)} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                <Plus className="w-3 h-3" /> New customer
              </button>
            )}
            {showNewCustomer && (
              <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-slate-600">New Customer</p>
                <div className="flex gap-1.5">
                  <Input value={newCustomer.first_name} onChange={e => setNewCustomer(n => ({ ...n, first_name: e.target.value }))} placeholder="First name" className="text-xs h-8" />
                  <Input value={newCustomer.last_name} onChange={e => setNewCustomer(n => ({ ...n, last_name: e.target.value }))} placeholder="Last name" className="text-xs h-8" />
                </div>
                <Input value={newCustomer.phone} onChange={e => setNewCustomer(n => ({ ...n, phone: e.target.value }))} placeholder="Phone (optional)" className="text-xs h-8" />
                <Input value={newCustomer.email} onChange={e => setNewCustomer(n => ({ ...n, email: e.target.value }))} placeholder="Email (optional)" className="text-xs h-8" />
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setShowNewCustomer(false)} className="flex-1 text-xs h-7">Cancel</Button>
                  <Button size="sm" onClick={handleCreateNewCustomer} disabled={savingCustomer || !newCustomer.first_name} className="flex-1 text-xs h-7 bg-blue-600 hover:bg-blue-700">
                    {savingCustomer ? "..." : "Add"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Customer Info Card */}
          {selectedCustomer && (
            <div className="border-b border-slate-200">
              {address && (
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${mapsQuery}&zoom=17&size=560x240&maptype=satellite&key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`}
                  alt="Property"
                  className="w-full h-28 object-cover"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <div className="p-4 space-y-1.5">
                <p className="font-semibold text-slate-800 text-sm">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                {address && <div className="flex items-start gap-1.5 text-xs text-slate-600"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />{address}</div>}
                {selectedCustomer.phone && <div className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="w-3 h-3 text-slate-400" /><a href={`tel:${selectedCustomer.phone}`} className="hover:text-blue-600">{selectedCustomer.phone}</a></div>}
                {selectedCustomer.email && <div className="flex items-center gap-1.5 text-xs text-slate-600"><Mail className="w-3 h-3 text-slate-400" /><span className="truncate">{selectedCustomer.email}</span></div>}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="p-4 border-b border-slate-200">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Title *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lawn Maintenance" className="bg-white text-sm" autoFocus />
          </div>

          {/* Valid Until */}
          <div className="p-4 border-b border-slate-200">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Valid Until</Label>
            <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} className="bg-white text-sm" />
          </div>

          {/* Schedule */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Schedule</span>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-slate-400 mb-0.5 block">From</Label>
                <Input type="datetime-local" value={form.scheduled_start || ""} onChange={e => setForm({ ...form, scheduled_start: e.target.value })} className="bg-white text-xs h-8" />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-0.5 block">To</Label>
                <Input type="datetime-local" value={form.scheduled_end || ""} onChange={e => setForm({ ...form, scheduled_end: e.target.value })} className="bg-white text-xs h-8" />
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Team</span>
            </div>
            <Select onValueChange={techId => {
              if (!form.assigned_techs?.includes(techId)) {
                setForm(f => ({ ...f, assigned_techs: [...(f.assigned_techs || []), techId] }));
              }
            }}>
              <SelectTrigger className="bg-white text-xs h-8"><SelectValue placeholder="Assign technician..." /></SelectTrigger>
              <SelectContent>
                {technicians.filter(t => !form.assigned_techs?.includes(t.id)).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1 mt-2">
              {(form.assigned_techs || []).length === 0 ? (
                <span className="text-xs text-slate-400 flex items-center gap-1"><UserCircle2 className="w-3 h-3" /> Unassigned</span>
              ) : (
                (form.assigned_techs || []).map(techId => {
                  const t = technicians.find(t => t.id === techId);
                  return t ? (
                    <span key={techId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                      {t.first_name} {t.last_name}
                      <button onClick={() => setForm(f => ({ ...f, assigned_techs: f.assigned_techs.filter(id => id !== techId) }))}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ) : null;
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Main */}
        <div className="flex-1 p-4 md:p-6 space-y-5">

          {/* Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Add notes for this estimate..." className="resize-none" />
          </div>

          {/* Line Items */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Line Items</h3>

            {/* Services */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Services</span>
                <button
                  onClick={() => setForm(f => ({ ...f, line_items: [...f.line_items, { ...defaultItem, _category: "Labor" }] }))}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Add service
                </button>
              </div>
              <div className="space-y-2">
                {form.line_items.map((item, idx) => item._category !== "Materials" ? (
                  <LineItemRow key={idx} item={item} idx={idx} companyId={activeCompany?.id} services={services} onServicesUpdate={svc => setServices(prev => [...prev, svc])} onUpdate={updateItem} onRemove={removeItem} />
                ) : null)}
              </div>
            </div>

            {/* Materials */}
            <div className="mb-4 border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Materials</span>
                <button
                  onClick={() => setForm(f => ({ ...f, line_items: [...f.line_items, { ...defaultItem, _category: "Materials" }] }))}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Add material
                </button>
              </div>
              <div className="space-y-2">
                {form.line_items.map((item, idx) => item._category === "Materials" ? (
                  <LineItemRow key={idx} item={item} idx={idx} companyId={activeCompany?.id} services={services} onServicesUpdate={svc => setServices(prev => [...prev, svc])} onUpdate={updateItem} onRemove={removeItem} />
                ) : null)}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">${(form.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Tax rate</span>
                  <Input type="number" value={form.tax_rate} onChange={e => {
                    const tax_rate = parseFloat(e.target.value) || 0;
                    const tax_amount = form.subtotal * (tax_rate / 100);
                    setForm({ ...form, tax_rate, tax_amount, total: form.subtotal + tax_amount - (form.discount || 0) });
                  }} className="w-16 h-7 text-sm bg-white" />
                  <span className="text-xs text-slate-400">%</span>
                </div>
                <span className="text-sm font-medium">${(form.tax_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-200">
                <span>Total</span>
                <span>${(form.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><ListChecks className="w-4 h-4" /> Checklist</h3>
              <button onClick={() => setForm(f => ({ ...f, checklist: [...(f.checklist || []), { item: "", completed: false }] }))} className="text-blue-600 hover:text-blue-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {(form.checklist || []).length === 0 ? (
              <p className="text-xs text-slate-400">No checklist items</p>
            ) : (
              <div className="space-y-1.5">
                {(form.checklist || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input type="checkbox" checked={item.completed} onChange={e => {
                      const updated = [...form.checklist]; updated[idx] = { ...updated[idx], completed: e.target.checked };
                      setForm(f => ({ ...f, checklist: updated }));
                    }} className="rounded" />
                    <Input value={item.item} onChange={e => {
                      const updated = [...form.checklist]; updated[idx] = { ...updated[idx], item: e.target.value };
                      setForm(f => ({ ...f, checklist: updated }));
                    }} placeholder="Checklist item..." className="text-xs h-7 flex-1 bg-white" />
                    <button onClick={() => setForm(f => ({ ...f, checklist: f.checklist.filter((_, i) => i !== idx) }))} className="text-slate-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Save */}
          <div className="flex gap-3 pb-8">
            <Button variant="outline" onClick={() => navigate("/Estimates")} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {saving ? "Creating..." : "Create Estimate"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}