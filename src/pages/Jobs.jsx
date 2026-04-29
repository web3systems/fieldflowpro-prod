import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  Plus, Search, Filter, MapPin, User, ChevronRight,
  Briefcase, Calendar, X, FileText, DollarSign, CheckCircle, CreditCard,
  Pencil, Tag, List, Paperclip, UserCircle, Clock, Trash2, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import CustomerNotesSection from "../components/jobs/CustomerNotesSection";
import UsageLimitBanner from "@/components/subscription/UsageLimitBanner";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "scheduled", label: "Scheduled", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "on_hold", label: "On Hold", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-slate-500" },
  { value: "medium", label: "Medium", color: "text-amber-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "urgent", label: "Urgent", color: "text-red-600" },
];

const defaultJob = {
  title: "", description: "", status: "new", priority: "medium",
  address: "", city: "", state: "", zip: "",
  scheduled_start: "", scheduled_end: "",
  customer_id: "", service_type: "", notes: "",
  internal_notes: "", line_items: [], tax_rate: 0, subtotal: 0, total_amount: 0
};

export default function Jobs() {
  const navigate = useNavigate();
  const { activeCompany } = useApp();
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultJob);
  const [saving, setSaving] = useState(false);
  const [invoicePromptJob, setInvoicePromptJob] = useState(null); // job that just completed
  const [invoiceActionLoading, setInvoiceActionLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [privateNoteTab, setPrivateNoteTab] = useState("job"); // "job" | "customer"
  const [customerSearch, setCustomerSearch] = useState("");
  const [anytime, setAnytime] = useState(false);
  const [openSection, setOpenSection] = useState(null); // which left-panel section is open
  const [tagInput, setTagInput] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (activeCompany) {
      loadData();
      base44.entities.Subscription.filter({ company_id: activeCompany.id })
        .then(subs => setSubscription(subs[0] || null)).catch(() => {});
    }
  }, [activeCompany?.id]);

  useEffect(() => {
    if (activeCompany) {
      const params = new URLSearchParams(window.location.search);
      const customerId = params.get("customer_id");
      if (customerId) {
        navigate(`/NewJob?customer_id=${customerId}`);
      }
    }
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [j, c, t, s] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
      base44.entities.Service.filter({ company_id: activeCompany.id, is_active: true }),
    ]);
    setJobs(j);
    setCustomers(c);
    setTechs(t);
    setServices(s);
    setLoading(false);
  }

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
    const items = (form.line_items || []).filter((_, i) => i !== idx);
    recalcTotals(items);
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
      const updated = { ...item, description: svc.name, unit_price: svc.unit_price || 0, total: (parseFloat(item.quantity) || 1) * (svc.unit_price || 0) };
      return updated;
    });
    recalcTotals(items);
  }

  function openCreate() {
    navigate("/NewJob");
  }

  function openEdit(job) {
    navigate(`/JobDetail/${job.id}`);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id };
    const wasCompleted = editing && editing.status !== "completed" && form.status === "completed";
    if (editing) {
      await base44.entities.Job.update(editing.id, data);
    } else {
      await base44.entities.Job.create(data);
    }
    setSaving(false);
    setSheetOpen(false);
    await loadData();
    if (wasCompleted) {
      setInvoicePromptJob({ ...editing, ...data });
    }
  }

  async function updateStatus(job, status) {
    await base44.entities.Job.update(job.id, { status });
    setJobs(jobs.map(j => j.id === job.id ? { ...j, status } : j));
    if (status === "completed") {
      setInvoicePromptJob({ ...job, status });
    }
  }

  async function generateInvoiceFromJob(job, collectPayment = false) {
    setInvoiceActionLoading(true);
    // If job came from an estimate, pull its line items
    let line_items = [];
    let subtotal = job.total_amount || 0;
    if (job.estimate_id) {
      const estimates = await base44.entities.Estimate.filter({ id: job.estimate_id });
      const est = estimates[0];
      if (est) {
        // Support both multi-option and legacy flat structure
        const opt = est.options?.[0];
        line_items = opt?.line_items || est.line_items || [];
        subtotal = opt?.subtotal || est.subtotal || opt?.total || est.total || 0;
      }
    }
    if (line_items.length === 0 && job.total_amount) {
      line_items = [{ description: job.title, quantity: 1, unit_price: job.total_amount, total: job.total_amount }];
    }
    const invoiceCount = await base44.entities.Invoice.list();
    const invoice_number = `INV-${String((invoiceCount.length || 0) + 1).padStart(4, "0")}`;
    const invoice = await base44.entities.Invoice.create({
      company_id: job.company_id,
      customer_id: job.customer_id,
      job_id: job.id,
      estimate_id: job.estimate_id || "",
      invoice_number,
      status: "sent",
      line_items,
      subtotal,
      total: job.total_amount || subtotal,
      amount_paid: 0,
    });
    setInvoicePromptJob(null);
    setInvoiceActionLoading(false);

    if (collectPayment && invoice?.id) {
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        alert("Payment checkout only works from the published app, not from the preview.");
        window.location.href = createPageUrl("Invoices");
        return;
      }
      const response = await base44.functions.invoke("createStripeCheckout", {
        invoice_id: invoice.id,
        success_url: window.location.origin + createPageUrl("Payments"),
        cancel_url: window.location.origin + createPageUrl("Invoices"),
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
        return;
      } else {
        alert(response.data?.error || "Failed to create payment session. Invoice was created.");
      }
    }
    window.location.href = createPageUrl("Invoices");
  }

  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || j.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusStyle = (status) => STATUS_OPTIONS.find(s => s.value === status)?.color || "bg-gray-100 text-gray-600";
  const getCustomerName = (id) => {
    const c = customers.find(c => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  return (
    <div className="relative min-h-full p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-7xl mx-auto">
      <UsageLimitBanner subscription={subscription} metric="jobs_per_month" currentCount={jobs.length} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} jobs</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Job
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="pl-9 bg-white"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-white">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Job Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No jobs found</p>
            <Button onClick={openCreate} className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Create First Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <Card
              key={job.id}
              className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => openEdit(job)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{getCustomerName(job.customer_id)}</h3>
                      <Badge className={`text-xs border ${getStatusStyle(job.status)}`}>
                        {job.status?.replace("_", " ")}
                      </Badge>
                      {job.priority === "urgent" && (
                        <Badge className="text-xs bg-red-100 text-red-700 border-red-200 border">Urgent</Badge>
                      )}
                    </div>
                    {job.title && (
                      <p className="text-sm text-slate-500 mt-0.5">{job.title}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {job.scheduled_start && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(job.scheduled_start), "MMM d, h:mm a")}
                        </span>
                      )}
                      {job.address && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent([job.address, job.city, job.state, job.zip].filter(Boolean).join(', '))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                        >
                          <MapPin className="w-3 h-3" />
                          {job.address}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {job.total_amount > 0 && (
                      <span className="text-sm font-semibold text-slate-700">
                        ${job.total_amount.toLocaleString()}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice / Payment Prompt Modal */}
      {invoicePromptJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1 text-center">Job Completed! 🎉</h2>
            <p className="text-slate-500 text-sm mb-5 text-center">
              <span className="font-semibold text-slate-700">{invoicePromptJob.title}</span> is done. How would you like to collect payment?
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => generateInvoiceFromJob(invoicePromptJob, true)}
                disabled={invoiceActionLoading}
                className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {invoiceActionLoading ? "Processing..." : "Collect Payment Now (Stripe)"}
              </Button>
              <Button
                onClick={() => generateInvoiceFromJob(invoicePromptJob, false)}
                disabled={invoiceActionLoading}
                variant="outline"
                className="w-full gap-2"
              >
                <FileText className="w-4 h-4" /> Generate Invoice Only
              </Button>
              <Button variant="ghost" onClick={() => setInvoicePromptJob(null)} className="w-full text-slate-500" disabled={invoiceActionLoading}>
                Skip for Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Job Modal */}
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-4 border-b gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <span className="text-lg font-semibold whitespace-nowrap">{editing ? "Edit Job" : "New Job"}</span>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Job title..."
                  className="w-full sm:w-56 h-8 text-sm"
                />
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => setSheetOpen(false)} className="gap-1"><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !form.title} className="bg-blue-600 hover:bg-blue-700">
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Job"}
                </Button>
              </div>
            </div>

            {/* Body: responsive columns */}
            <div className="flex flex-col md:flex-row min-h-0">
              {/* Left column */}
              <div className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r bg-slate-50 p-4 space-y-4 md:overflow-y-auto">

                {/* Customer */}
                <div className="bg-white border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-sm text-slate-700">Customer</span>
                  </div>
                  <Input
                    placeholder="Name, email, phone, or address"
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
                  {form.customer_id && !customerSearch.includes(" ") && (
                    <div className="text-sm text-slate-600 font-medium">
                      {getCustomerName(form.customer_id)}
                    </div>
                  )}
                  <Link to="/Customers?new=1" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1" onClick={() => setSheetOpen(false)}>
                    <Plus className="w-3.5 h-3.5" /> New customer
                  </Link>
                </div>

                {/* Schedule */}
                <div className="bg-white border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-sm text-slate-700">Schedule</span>
                    </div>
                    <Pencil className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
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
                <div className="bg-white border rounded-lg p-3">
                  <Select value={form.assigned_techs?.[0] || ""} onValueChange={v => setForm({ ...form, assigned_techs: [v] })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Edit team" /></SelectTrigger>
                    <SelectContent>
                      {techs.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    {form.assigned_techs?.length > 0 ? (
                      form.assigned_techs.map(tid => {
                        const t = techs.find(x => x.id === tid);
                        return t ? (
                          <Badge key={tid} variant="secondary" className="text-xs gap-1">
                            <User className="w-3 h-3" />{t.first_name} {t.last_name}
                          </Badge>
                        ) : null;
                      })
                    ) : (
                      <Badge variant="secondary" className="text-xs text-slate-400">Unassigned</Badge>
                    )}
                  </div>
                </div>

                {/* Checklists */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <button className="w-full px-3 py-2 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50" onClick={() => setOpenSection(openSection === "checklist" ? null : "checklist")}>
                    <div className="flex items-center gap-2"><List className="w-4 h-4" />Checklists {(form.checklist||[]).length > 0 && <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">{(form.checklist||[]).length}</span>}</div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                  {openSection === "checklist" && (
                    <div className="px-3 pb-3 border-t space-y-2 pt-2">
                      {(form.checklist||[]).map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="checkbox" checked={item.completed||false} onChange={e => { const cl=[...(form.checklist||[])]; cl[i]={...cl[i],completed:e.target.checked}; setForm(f=>({...f,checklist:cl})); }} className="rounded" />
                          <span className={`text-xs flex-1 ${item.completed?"line-through text-slate-400":"text-slate-700"}`}>{item.item}</span>
                          <button onClick={() => setForm(f=>({...f,checklist:(f.checklist||[]).filter((_,idx)=>idx!==i)}))} className="text-slate-300 hover:text-red-400"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <div className="flex gap-1">
                        <Input value={checklistInput} onChange={e=>setChecklistInput(e.target.value)} placeholder="New item..." className="h-7 text-xs" onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(checklistInput.trim()){setForm(f=>({...f,checklist:[...(f.checklist||[]),{item:checklistInput.trim(),completed:false}]}));setChecklistInput("");}}}} />
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={()=>{if(checklistInput.trim()){setForm(f=>({...f,checklist:[...(f.checklist||[]),{item:checklistInput.trim(),completed:false}]}));setChecklistInput("");}}}><Plus className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <button className="w-full px-3 py-2 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50" onClick={() => setOpenSection(openSection === "tags" ? null : "tags")}>
                    <div className="flex items-center gap-2"><Tag className="w-4 h-4" />Tags {(form.tags||[]).length > 0 && <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">{(form.tags||[]).length}</span>}</div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                  {openSection === "tags" && (
                    <div className="px-3 pb-3 border-t pt-2 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {(form.tags||[]).map(tag=>(
                          <span key={tag} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{tag}<button onClick={()=>setForm(f=>({...f,tags:(f.tags||[]).filter(t=>t!==tag)}))} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button></span>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <Input value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="Add tag..." className="h-7 text-xs" onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(tagInput.trim()&&!(form.tags||[]).includes(tagInput.trim())){setForm(f=>({...f,tags:[...(f.tags||[]),tagInput.trim()]}));setTagInput("");}}}} />
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={()=>{if(tagInput.trim()&&!(form.tags||[]).includes(tagInput.trim())){setForm(f=>({...f,tags:[...(f.tags||[]),tagInput.trim()]}));setTagInput("");}}}><Plus className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fields */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <button className="w-full px-3 py-2 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50" onClick={() => setOpenSection(openSection === "fields" ? null : "fields")}>
                    <div className="flex items-center gap-2"><FileText className="w-4 h-4" />Fields</div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                  {openSection === "fields" && (
                    <div className="px-3 pb-3 border-t pt-2 space-y-2">
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea value={form.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Job description..." className="text-xs resize-none" />
                      </div>
                      <div>
                        <Label className="text-xs">Service Type</Label>
                        <Input value={form.service_type||""} onChange={e=>setForm(f=>({...f,service_type:e.target.value}))} placeholder="e.g. HVAC, Cleaning..." className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Address</Label>
                        <Input value={form.address||""} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="Street address" className="h-8 text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div><Label className="text-xs">City</Label><Input value={form.city||""} onChange={e=>setForm(f=>({...f,city:e.target.value}))} className="h-8 text-xs" /></div>
                        <div><Label className="text-xs">State</Label><Input value={form.state||""} onChange={e=>setForm(f=>({...f,state:e.target.value}))} className="h-8 text-xs" maxLength={2} /></div>
                      </div>
                      <div>
                        <Label className="text-xs">ZIP</Label>
                        <Input value={form.zip||""} onChange={e=>setForm(f=>({...f,zip:e.target.value}))} className="h-8 text-xs" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Lead Source */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <button className="w-full px-3 py-2 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50" onClick={() => setOpenSection(openSection === "leadsource" ? null : "leadsource")}>
                    <div className="flex items-center gap-2"><User className="w-4 h-4" />Lead source {form.lead_source && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full capitalize">{form.lead_source}</span>}</div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                  {openSection === "leadsource" && (
                    <div className="px-3 pb-3 border-t pt-2">
                      <Select value={form.lead_source||""} onValueChange={v=>setForm(f=>({...f,lead_source:v}))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select source..." /></SelectTrigger>
                        <SelectContent>
                          {["Website","Referral","Google","Facebook","Instagram","Phone","Walk-in","Other"].map(s=>(
                            <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <button className="w-full px-3 py-2 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50" onClick={() => setOpenSection(openSection === "priority" ? null : "priority")}>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4" />Priority {form.priority && <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded-full capitalize">{form.priority}</span>}</div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                  {openSection === "priority" && (
                    <div className="px-3 pb-3 border-t pt-2">
                      <Select value={form.priority||"medium"} onValueChange={v=>setForm(f=>({...f,priority:v}))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map(p=><SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="flex-1 p-4 md:p-5 space-y-5 bg-slate-50 md:overflow-y-auto">

                {/* Private Notes */}
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-slate-700">Private notes</span>
                    </div>
                    <div className="flex rounded-full border overflow-hidden text-xs">
                      <button
                        className={`px-3 py-1 ${privateNoteTab === "job" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                        onClick={() => setPrivateNoteTab("job")}
                      >This job</button>
                      <button
                        className={`px-3 py-1 ${privateNoteTab === "customer" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                        onClick={() => setPrivateNoteTab("customer")}
                      >Customer</button>
                    </div>
                  </div>
                  <Textarea
                    value={privateNoteTab === "job" ? form.internal_notes || "" : form.notes || ""}
                    onChange={e => setForm({ ...form, [privateNoteTab === "job" ? "internal_notes" : "notes"]: e.target.value })}
                    placeholder="Add a private note here"
                    rows={2}
                    className="text-sm resize-none border-slate-200"
                  />
                </div>

                {/* Line Items */}
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-slate-700">Line items</span>
                  </div>

                  {/* Services */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600">Services</span>
                      <span className="text-xs text-blue-600 cursor-pointer">Service Price Book</span>
                    </div>
                    {(form.line_items || []).filter(i => i.type === "service").map((item, idx) => {
                      const realIdx = (form.line_items || []).indexOf(item);
                      return (
                        <div key={realIdx} className="flex items-center gap-2 mb-2">
                          <Select value="" onValueChange={v => selectServiceForItem(realIdx, v)}>
                            <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder={item.description || "Select service"} /></SelectTrigger>
                            <SelectContent>
                                {services.filter(s => s.item_type === "service" || !s.item_type).map(s => <SelectItem key={s.id} value={s.id}>{s.name} {s.unit_price > 0 ? `— $${s.unit_price.toFixed(2)}` : ""}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input type="number" value={item.quantity} onChange={e => updateLineItem(realIdx, "quantity", e.target.value)} className="w-14 h-8 text-xs" placeholder="Qty" />
                          <Input type="number" value={item.unit_price} onChange={e => updateLineItem(realIdx, "unit_price", e.target.value)} className="w-20 h-8 text-xs" placeholder="Price" />
                          <span className="text-sm w-16 text-right text-slate-700">${(item.total || 0).toFixed(2)}</span>
                          <button onClick={() => removeLineItem(realIdx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      );
                    })}
                    <button onClick={() => addLineItem("service")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1">
                      <Plus className="w-3.5 h-3.5" /> Add service
                    </button>
                  </div>

                  {/* Materials */}
                  <div className="mb-4 border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600">Materials</span>
                      <span className="text-xs text-blue-600 cursor-pointer">Material Price Book</span>
                    </div>
                    {(form.line_items || []).filter(i => i.type === "material").map((item, idx) => {
                      const realIdx = (form.line_items || []).indexOf(item);
                      return (
                        <div key={realIdx} className="flex items-center gap-2 mb-2">
                          <Select value="" onValueChange={v => selectServiceForItem(realIdx, v)}>
                            <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder={item.description || "Select material"} /></SelectTrigger>
                            <SelectContent>
                                {services.filter(s => s.item_type === "material").map(s => <SelectItem key={s.id} value={s.id}>{s.name} {s.unit_price > 0 ? `— $${s.unit_price.toFixed(2)}` : ""}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input type="number" value={item.quantity} onChange={e => updateLineItem(realIdx, "quantity", e.target.value)} className="w-14 h-8 text-xs" placeholder="Qty" />
                          <Input type="number" value={item.unit_price} onChange={e => updateLineItem(realIdx, "unit_price", e.target.value)} className="w-20 h-8 text-xs" placeholder="Price" />
                          <span className="text-sm w-16 text-right text-slate-700">${(item.total || 0).toFixed(2)}</span>
                          <button onClick={() => removeLineItem(realIdx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      );
                    })}
                    <button onClick={() => addLineItem("material")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1">
                      <Plus className="w-3.5 h-3.5" /> Add material
                    </button>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="text-amber-600">${(form.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <div>
                        <span>Tax rate</span>
                        <p className="text-xs text-slate-400">Tax ({form.tax_rate || 0}%)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600">${((form.subtotal || 0) * (form.tax_rate || 0) / 100).toFixed(2)}</span>
                        <button onClick={() => {
                          const rate = parseFloat(prompt("Enter tax rate %", form.tax_rate || 0));
                          if (!isNaN(rate)) {
                            const tax = (form.subtotal || 0) * rate / 100;
                            setForm(prev => ({ ...prev, tax_rate: rate, total_amount: (prev.subtotal || 0) + tax }));
                          }
                        }}>
                          <Pencil className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 text-base pt-1 border-t">
                      <span>Total</span>
                      <span>${(form.total_amount || 0).toFixed(2)}</span>
                    </div>
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