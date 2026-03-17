import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  Plus, Search, Filter, MapPin, User, ChevronRight,
  Briefcase, Calendar, X, FileText, DollarSign, CheckCircle, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import CustomerNotesSection from "../components/jobs/CustomerNotesSection";

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
  customer_id: "", service_type: "", notes: ""
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

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  useEffect(() => {
    if (activeCompany && customers.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const customerId = params.get("customer_id");
      if (customerId) {
        setEditing(null);
        setForm({ ...defaultJob, customer_id: customerId });
        setSheetOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [activeCompany, customers]);

  async function loadData() {
    setLoading(true);
    const [j, c, t] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
    ]);
    setJobs(j);
    setCustomers(c);
    setTechs(t);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(defaultJob);
    setSheetOpen(true);
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
        line_items = est.line_items || [];
        subtotal = est.subtotal || est.total || 0;
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
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-7xl mx-auto">
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
                      {false && (
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

      {/* Job Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Job" : "New Job"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
            <div>
              <Label>Job Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Weekly Lawn Service" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Customer</Label>
              <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Type</Label>
              <Input value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} placeholder="e.g. Lawn Mowing, Deep Clean" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date & Time</Label>
                <Input type="datetime-local" value={form.scheduled_start} onChange={e => setForm({ ...form, scheduled_start: e.target.value })} />
              </div>
              <div>
                <Label>End Date & Time</Label>
                <Input type="datetime-local" value={form.scheduled_end} onChange={e => setForm({ ...form, scheduled_end: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Service Address</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2} />
              </div>
              <div>
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Total Amount ($)</Label>
              <Input type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Job details..." />
            </div>
            <div>
              <Label>Internal Notes</Label>
              <Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} rows={2} placeholder="Notes for your team..." />
            </div>
            <div className="border-t pt-4">
              <CustomerNotesSection
                job={editing}
                customer={customers.find(c => c.id === (editing?.customer_id || form.customer_id))}
                onNoteAdded={(updatedNotes) => {
                  setEditing(prev => prev ? { ...prev, customer_notes: updatedNotes } : prev);
                }}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Job"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}