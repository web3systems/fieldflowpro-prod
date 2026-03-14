import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, MapPin, User, Calendar, DollarSign, Briefcase,
  Save, Edit2, FileText, CreditCard, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import CustomerNotesSection from "../components/jobs/CustomerNotesSection";
import InternalNotesSection from "../components/jobs/InternalNotesSection";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "scheduled", label: "Scheduled", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "on_hold", label: "On Hold", color: "bg-gray-100 text-gray-700 border-gray-200" },
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
  customer_id: "", service_type: "", notes: "", internal_notes: "", total_amount: 0
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeCompany } = useApp();

  const [job, setJob] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultJob);
  const [editingInfo, setEditingInfo] = useState(false);
  const [invoiceActionLoading, setInvoiceActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [jobs, c, t] = await Promise.all([
      base44.entities.Job.filter({ id }),
      activeCompany ? base44.entities.Customer.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
      activeCompany ? base44.entities.Technician.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
    ]);
    if (jobs.length > 0) { setJob(jobs[0]); setForm({ ...defaultJob, ...jobs[0] }); }
    setCustomers(c);
    setTechs(t);
    setLoading(false);
  }, [id, activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSave() {
    setSaving(true);
    await base44.entities.Job.update(id, form);
    setJob(j => ({ ...j, ...form }));
    setSaving(false);
    setEditingInfo(false);
  }

  async function generateInvoice(collectPayment = false) {
    setInvoiceActionLoading(true);
    let line_items = [];
    let subtotal = form.total_amount || 0;
    if (job.estimate_id) {
      const ests = await base44.entities.Estimate.filter({ id: job.estimate_id });
      if (ests[0]) { line_items = ests[0].line_items || []; subtotal = ests[0].subtotal || ests[0].total || 0; }
    }
    if (line_items.length === 0 && form.total_amount) {
      line_items = [{ description: form.title, quantity: 1, unit_price: form.total_amount, total: form.total_amount }];
    }
    const allInv = await base44.entities.Invoice.list();
    const invoice_number = `INV-${String((allInv.length || 0) + 1).padStart(4, "0")}`;
    const invoice = await base44.entities.Invoice.create({
      company_id: activeCompany.id,
      customer_id: form.customer_id,
      job_id: id,
      estimate_id: job.estimate_id || "",
      invoice_number,
      status: "sent",
      line_items,
      subtotal,
      total: form.total_amount || subtotal,
      amount_paid: 0,
    });
    setInvoiceActionLoading(false);

    if (collectPayment && invoice?.id) {
      const isInIframe = window.self !== window.top;
      if (isInIframe) { alert("Payment checkout only works from the published app."); navigate(createPageUrl("Invoices")); return; }
      const res = await base44.functions.invoke("createStripeCheckout", {
        invoice_id: invoice.id,
        success_url: window.location.origin + createPageUrl("Payments"),
        cancel_url: window.location.origin + createPageUrl("Invoices"),
      });
      if (res.data?.url) { window.location.href = res.data.url; return; }
    }
    navigate(createPageUrl("Invoices"));
  }

  const getCustomerName = (cid) => {
    const c = customers.find(c => c.id === cid);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };
  const getStatusStyle = (status) => STATUS_OPTIONS.find(s => s.value === status)?.color || "bg-gray-100 text-gray-600";

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!job) return <div className="p-6 text-center text-slate-500">Job not found.</div>;

  const fullAddress = [form.address, form.city, form.state, form.zip].filter(Boolean).join(", ");

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("Jobs"))} className="gap-1 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Jobs
        </Button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white flex-shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{form.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`text-xs border ${getStatusStyle(form.status)}`}>{form.status?.replace("_", " ")}</Badge>
              {form.priority === "urgent" && <Badge className="text-xs bg-red-100 text-red-700 border-red-200 border">Urgent</Badge>}
            </div>
          </div>
        </div>
        {form.status === "completed" && (
          <Button size="sm" className="gap-1 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => generateInvoice(false)}>
            <FileText className="w-3.5 h-3.5" /> Generate Invoice
          </Button>
        )}
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</p>
                <button onClick={() => setEditingInfo(!editingInfo)} className="text-slate-400 hover:text-blue-600">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {editingInfo ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Customer</Label>
                    <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                    </Select>
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
                    <Label className="text-xs">Start</Label>
                    <Input type="datetime-local" value={form.scheduled_start || ""} onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">End</Label>
                    <Input type="datetime-local" value={form.scheduled_end || ""} onChange={e => setForm(f => ({ ...f, scheduled_end: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Total Amount ($)</Label>
                    <Input type="number" value={form.total_amount || ""} onChange={e => setForm(f => ({ ...f, total_amount: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                  </div>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="w-full gap-1 bg-blue-600 hover:bg-blue-700">
                    <Save className="w-3 h-3" />{saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm"><User className="w-3.5 h-3.5 text-slate-400" /><span className="text-slate-700">{getCustomerName(form.customer_id)}</span></div>
                  {form.scheduled_start && (
                    <div className="flex items-center gap-2 text-sm"><Calendar className="w-3.5 h-3.5 text-slate-400" /><span className="text-slate-600">{format(new Date(form.scheduled_start), "MMM d, h:mm a")}</span></div>
                  )}
                  {fullAddress && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
                      <MapPin className="w-3.5 h-3.5" /><span className="truncate">{form.address || fullAddress}</span>
                    </a>
                  )}
                  {form.total_amount > 0 && (
                    <div className="flex items-center gap-2 text-sm"><DollarSign className="w-3.5 h-3.5 text-slate-400" /><span className="font-semibold text-slate-900">${form.total_amount.toLocaleString()}</span></div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {form.status === "completed" && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Collect Payment</p>
                <Button onClick={() => generateInvoice(true)} disabled={invoiceActionLoading} className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
                  <CreditCard className="w-4 h-4" />{invoiceActionLoading ? "Processing..." : "Collect via Stripe"}
                </Button>
                <Button onClick={() => generateInvoice(false)} disabled={invoiceActionLoading} variant="outline" className="w-full gap-2">
                  <FileText className="w-4 h-4" /> Generate Invoice
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile info */}
          <div className="lg:hidden">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm"><User className="w-3.5 h-3.5 text-slate-400" /><span>{getCustomerName(form.customer_id)}</span></div>
                {form.scheduled_start && <div className="flex items-center gap-2 text-sm"><Calendar className="w-3.5 h-3.5 text-slate-400" /><span>{format(new Date(form.scheduled_start), "MMM d")}</span></div>}
                {form.total_amount > 0 && <div className="flex items-center gap-2 text-sm"><DollarSign className="w-3.5 h-3.5 text-slate-400" /><span className="font-semibold">${form.total_amount.toLocaleString()}</span></div>}
              </CardContent>
            </Card>
          </div>

          {/* Service Address */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Service Address</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={form.address || ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={form.city || ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
                <Input value={form.state || ""} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="State" maxLength={2} />
                <Input value={form.zip || ""} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} placeholder="ZIP" />
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm text-slate-600">Job Description</Label>
                <Textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Job details..." className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-slate-600">Internal Notes</Label>
                <Textarea value={form.internal_notes || ""} onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))} rows={2} placeholder="Notes for your team..." className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Customer Notes */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <CustomerNotesSection
                job={job}
                customer={customers.find(c => c.id === form.customer_id)}
                onNoteAdded={(updatedNotes) => setJob(j => j ? { ...j, customer_notes: updatedNotes } : j)}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}