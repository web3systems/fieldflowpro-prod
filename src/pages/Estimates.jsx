import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  Plus, FileText, Search, Trash2, ChevronRight,
  CheckCircle, XCircle, Briefcase, Download, Copy,
  Phone, Mail, MapPin, ExternalLink, X, Calendar, Users, 
  ListChecks, Paperclip, UserCircle2, ArrowLeft
} from "lucide-react";
import { downloadEstimatePdf } from "../components/documents/generatePdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { format } from "date-fns";
import LineItemRow from "@/components/services/LineItemRow";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

const defaultItem = { description: "", quantity: 1, unit_price: 0, total: 0, service_id: null };
const defaultForm = {
  title: "", customer_id: "", status: "draft",
  line_items: [{ ...defaultItem }], subtotal: 0, tax_rate: 0,
  tax_amount: 0, discount: 0, total: 0,
  notes: "", valid_until: "",
  scheduled_start: "", scheduled_end: "",
  assigned_techs: [], checklist: []
};

export default function Estimates() {
  const navigate = useNavigate();
  const { activeCompany } = useApp();
  const [estimates, setEstimates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: "", last_name: "", phone: "", email: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  useEffect(() => {
    if (activeCompany && customers.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const customerId = params.get("customer_id");
      if (customerId) {
        const num = `EST-${String(estimates.length + 1).padStart(4, "0")}`;
        const tax_rate = activeCompany?.default_tax_rate || 0;
        setEditing(null);
        setForm({ ...defaultForm, estimate_number: num, customer_id: customerId, line_items: normalizeLineItems([{ ...defaultItem }]), tax_rate });
        setSheetOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [activeCompany, customers]);

  async function loadData() {
    setLoading(true);
    const [e, c, t, svcs] = await Promise.all([
      base44.entities.Estimate.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
      base44.entities.Service.filter({ company_id: activeCompany.id, is_active: true }),
    ]);
    // Normalize all loaded estimates to ensure line_items have service_id
    const normalized = e.map(est => ({
      ...est,
      line_items: normalizeLineItems(est.line_items)
    }));
    setEstimates(normalized);
    setCustomers(c);
    setTechnicians(t);
    setServices(svcs);
    setLoading(false);
  }

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
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total });
  }

  function addItem() {
    setForm({ ...form, line_items: [...form.line_items, { ...defaultItem }] });
  }

  function addServiceAsItem(service) {
    const items = [...form.line_items];
    // If last item is empty, replace it; otherwise append
    const last = items[items.length - 1];
    if (last && !last.description && !last.unit_price) {
      items[items.length - 1] = service;
    } else {
      items.push(service);
    }
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total });
  }

  function removeItem(index) {
    const items = form.line_items.filter((_, i) => i !== index);
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total });
  }

  function openCreate() {
    setEditing(null);
    const num = `EST-${String(estimates.length + 1).padStart(4, "0")}`;
    const tax_rate = activeCompany?.default_tax_rate || 0;
    setForm({ ...defaultForm, estimate_number: num, line_items: normalizeLineItems([{ ...defaultItem }]), tax_rate });
    setSheetOpen(true);
  }

  function openEdit(est) {
    navigate(`/EstimateDetail/${est.id}`);
  }

  function normalizeLineItems(items) {
    return (items || []).map(item => ({ ...defaultItem, ...item }));
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id };
    if (editing) {
      await base44.entities.Estimate.update(editing.id, data);
    } else {
      await base44.entities.Estimate.create(data);
    }
    setSaving(false);
    setSheetOpen(false);
    await loadData();
  }

  async function handleApprove() {
    setApproving(true);
    // Mark estimate as approved
    await base44.entities.Estimate.update(editing.id, { status: "approved" });
    // Create a job from this estimate
    const job = await base44.entities.Job.create({
      company_id: activeCompany.id,
      customer_id: form.customer_id,
      estimate_id: editing.id,
      title: form.title,
      description: form.notes || "",
      status: "new",
      total_amount: form.total,
      service_type: "",
    });
    setApproving(false);
    setSheetOpen(false);
    await loadData();
    // Navigate to the jobs page
    window.location.href = createPageUrl("Jobs");
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const num = `EST-${String(estimates.length + 2).padStart(4, "0")}`;
    const { id, created_date, updated_date, ...rest } = editing;
    await base44.entities.Estimate.create({ ...rest, ...form, estimate_number: num, status: "draft" });
    setDuplicating(false);
    setSheetOpen(false);
    await loadData();
  }

  function handleDownloadPdf() {
    const customer = customers.find(c => c.id === form.customer_id);
    downloadEstimatePdf({ ...form, id: editing?.id }, customer, activeCompany);
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

  function handleExportCsv() {
    const rows = [["Estimate #", "Title", "Customer", "Status", "Total", "Valid Until"]];
    estimates.forEach(e => {
      rows.push([
        e.estimate_number || "",
        e.title || "",
        getCustomerName(e.customer_id),
        e.status || "",
        (e.total || 0).toFixed(2),
        e.valid_until || "",
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "estimates.csv"; a.click();
  }

  async function handleDecline() {
    await base44.entities.Estimate.update(editing.id, { status: "declined" });
    setSheetOpen(false);
    await loadData();
  }

  const filtered = estimates.filter(e =>
    !search || e.title?.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerName = (id) => {
    const c = customers.find(c => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  return (
    <div className="relative min-h-full p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estimates</h1>
          <p className="text-slate-500 text-sm mt-0.5">{estimates.length} estimates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2 hidden sm:flex">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Estimate
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search estimates..." className="pl-9 bg-white" />
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No estimates yet</p>
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Create Estimate</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(est => (
            <Card key={est.id} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => openEdit(est)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-slate-900">{getCustomerName(est.customer_id)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{est.estimate_number}</span>
                      <span className="text-sm text-slate-600">{est.title}</span>
                      <Badge className={`text-xs capitalize ${STATUS_STYLES[est.status] || "bg-gray-100 text-gray-600"}`}>
                        {est.status}
                      </Badge>
                      {est.valid_until && (
                        <span className="text-xs text-slate-400">Valid until {format(new Date(est.valid_until), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-base font-bold text-slate-800">${(est.total || 0).toLocaleString()}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex flex-col md:flex-row">
            {/* Left sidebar */}
            <div className="w-full md:w-72 flex-shrink-0 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none">

              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-slate-50 z-10 rounded-t-2xl md:rounded-tl-2xl md:rounded-tr-none">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">{editing ? "Edit Estimate" : "New Estimate"}</h2>
                  {form.estimate_number && <p className="text-xs text-slate-400 font-mono mt-0.5">{form.estimate_number}</p>}
                </div>
                <button onClick={() => setSheetOpen(false)} className="p-2 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
              </div>

              {/* Customer selector */}
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
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
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
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setShowNewCustomer(false)} className="flex-1 text-xs h-7">Cancel</Button>
                      <Button size="sm" onClick={handleCreateNewCustomer} disabled={savingCustomer || !newCustomer.first_name || !newCustomer.last_name} className="flex-1 text-xs h-7 bg-blue-600 hover:bg-blue-700">
                        {savingCustomer ? "Saving..." : "Add"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer card — shown when customer is selected */}
              {form.customer_id && (() => {
                const cust = customers.find(c => c.id === form.customer_id);
                if (!cust) return null;
                const address = [cust.address, cust.city, cust.state, cust.zip].filter(Boolean).join(", ");
                const mapsQuery = encodeURIComponent(address);
                const streetViewUrl = address
                  ? `https://maps.googleapis.com/maps/api/streetview?size=280x140&location=${mapsQuery}&key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`
                  : null;
                const mapsLink = address ? `https://www.google.com/maps/search/?api=1&query=${mapsQuery}` : null;
                return (
                  <div className="border-b border-slate-200">
                    {/* Street view map */}
                    {address && (
                      <div className="relative">
                        <img
                          src={`https://maps.googleapis.com/maps/api/staticmap?center=${mapsQuery}&zoom=17&size=560x240&maptype=satellite&key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`}
                          alt="Property map"
                          className="w-full h-32 object-cover"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                          className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded p-1 shadow text-slate-600">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-800">{cust.first_name} {cust.last_name}</p>
                        <a href={`/CustomerDetail/${cust.id}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                          View details <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {address && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 leading-snug">{address}</a>
                        </div>
                      )}
                      {cust.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                          <a href={`tel:${cust.phone}`} className="hover:text-blue-600">{cust.phone}</a>
                        </div>
                      )}
                      {cust.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                          <a href={`mailto:${cust.email}`} className="hover:text-blue-600 truncate">{cust.email}</a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Title */}
              <div className="p-4 space-y-1.5 border-b border-slate-200">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lawn Maintenance" className="bg-white text-sm" />
              </div>

              {/* Status + Valid Until */}
              <div className="p-4 space-y-3 border-b border-slate-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger className="bg-white text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(STATUS_STYLES).map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valid Until</Label>
                  <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} className="bg-white text-sm" />
                </div>
              </div>

              {/* Schedule */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Schedule</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-400 mb-1 block">From</Label>
                    <Input type="datetime-local" value={form.scheduled_start || ""} onChange={e => setForm({ ...form, scheduled_start: e.target.value })} className="bg-white text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400 mb-1 block">To</Label>
                    <Input type="datetime-local" value={form.scheduled_end || ""} onChange={e => setForm({ ...form, scheduled_end: e.target.value })} className="bg-white text-xs h-8" />
                  </div>
                </div>
              </div>

              {/* Team */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
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
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(form.assigned_techs || []).length === 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-xs">
                      <UserCircle2 className="w-3 h-3" /> Unassigned
                    </span>
                  )}
                  {(form.assigned_techs || []).map(techId => {
                    const t = technicians.find(t => t.id === techId);
                    if (!t) return null;
                    return (
                      <span key={techId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                        {t.first_name} {t.last_name}
                        <button onClick={() => setForm(f => ({ ...f, assigned_techs: f.assigned_techs.filter(id => id !== techId) }))} className="hover:text-blue-900 ml-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Checklists */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Checklist</span>
                  </div>
                  <button
                    onClick={() => setForm(f => ({ ...f, checklist: [...(f.checklist || []), { item: "", completed: false }] }))}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {(form.checklist || []).length === 0 && (
                  <p className="text-xs text-slate-400">No checklist items</p>
                )}
                <div className="space-y-1.5">
                  {(form.checklist || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="checkbox" checked={item.completed} onChange={e => {
                        const updated = [...form.checklist];
                        updated[idx] = { ...updated[idx], completed: e.target.checked };
                        setForm(f => ({ ...f, checklist: updated }));
                      }} className="rounded" />
                      <Input
                        value={item.item}
                        onChange={e => {
                          const updated = [...form.checklist];
                          updated[idx] = { ...updated[idx], item: e.target.value };
                          setForm(f => ({ ...f, checklist: updated }));
                        }}
                        placeholder="Checklist item..."
                        className="text-xs h-7 flex-1 bg-white"
                      />
                      <button onClick={() => setForm(f => ({ ...f, checklist: f.checklist.filter((_, i) => i !== idx) }))} className="text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2 mt-auto">
                {editing && !["approved", "declined"].includes(form.status) && (
                  <>
                    <Button onClick={handleDecline} variant="outline" className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 text-sm">
                      <XCircle className="w-4 h-4" /> Decline
                    </Button>
                    <Button onClick={handleApprove} disabled={approving} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {approving ? "Creating Job..." : "Approve & Create Job"}
                    </Button>
                  </>
                )}
                {editing && form.status === "approved" && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 text-xs">
                    <Briefcase className="w-3.5 h-3.5" /> Approved — job created.
                  </div>
                )}
                {editing && form.status === "declined" && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs">
                    <XCircle className="w-3.5 h-3.5" /> Estimate declined.
                  </div>
                )}
                {editing && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadPdf} className="flex-1 gap-1 text-xs">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </Button>
                    <Button variant="outline" onClick={handleDuplicate} disabled={duplicating} className="flex-1 gap-1 text-xs">
                      <Copy className="w-3.5 h-3.5" /> {duplicating ? "..." : "Dupe"}
                    </Button>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1 text-sm">Cancel</Button>
                  <Button onClick={handleSave} disabled={saving || !form.title} className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm">
                    {saving ? "Saving..." : editing ? "Save" : "Create"}
                  </Button>
                </div>
              </div>
            </div> {/* end left sidebar */}

            {/* Right main area */}
            <div className="flex-1 p-4 sm:p-5 space-y-5">
              {/* Private notes */}
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Private Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Add a private note here..."
                  className="bg-white text-sm"
                />
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-3">Line Items</h3>

                {/* Services section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">Services</span>
                    <button
                      onClick={() => {
                        const newItem = { service_id: null, description: "", quantity: 1, unit_price: 0, total: 0, _category: "Labor" };
                        setForm(f => ({ ...f, line_items: [...f.line_items, newItem] }));
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add service
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.line_items.map((item, idx) => item._category !== "Materials" ? (
                      <LineItemRow key={idx} item={item} idx={idx} companyId={activeCompany?.id} services={services} onServicesUpdate={svc => setServices(prev => [...prev, svc])} onUpdate={updateItem} onRemove={removeItem} categoryFilter="Labor" />
                    ) : null)}
                  </div>
                </div>

                {/* Materials section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">Materials</span>
                    <button
                      onClick={() => {
                        const newItem = { service_id: null, description: "", quantity: 1, unit_price: 0, total: 0, _category: "Materials" };
                        setForm(f => ({ ...f, line_items: [...f.line_items, newItem] }));
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add material
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.line_items.map((item, idx) => item._category === "Materials" ? (
                      <LineItemRow key={idx} item={item} idx={idx} companyId={activeCompany?.id} services={services} onServicesUpdate={svc => setServices(prev => [...prev, svc])} onUpdate={updateItem} onRemove={removeItem} categoryFilter="Materials" />
                    ) : null)}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">${(form.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Tax rate</span>
                      <Input
                        type="number"
                        value={form.tax_rate}
                        onChange={e => {
                          const tax_rate = parseFloat(e.target.value) || 0;
                          const tax_amount = form.subtotal * (tax_rate / 100);
                          const total = form.subtotal + tax_amount - (form.discount || 0);
                          setForm({ ...form, tax_rate, tax_amount, total });
                        }}
                        className="w-16 h-7 text-sm bg-white"
                      />
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}