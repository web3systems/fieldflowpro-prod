import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Briefcase, Star, CreditCard, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import JobSidebar from "@/components/jobs/JobSidebar";
import JobAppointmentSection from "@/components/jobs/JobAppointmentSection";
import JobFieldTechSection from "@/components/jobs/JobFieldTechSection";
import JobLineItemsSection from "@/components/jobs/JobLineItemsSection";
import JobInvoiceSection from "@/components/jobs/JobInvoiceSection";
import JobNotesSection from "@/components/jobs/JobNotesSection";

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  scheduled: "bg-purple-100 text-purple-700 border-purple-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  on_hold: "bg-gray-100 text-gray-700 border-gray-200",
};

const defaultJob = {
  title: "", description: "", status: "new", priority: "medium",
  address: "", city: "", state: "", zip: "",
  scheduled_start: "", scheduled_end: "",
  customer_id: "", service_type: "", notes: "", internal_notes: "",
  total_amount: 0, line_items: [], tax_rate: 0, discount: 0,
  assigned_techs: [], tags: [],
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
  const [invoiceActionLoading, setInvoiceActionLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [form, setForm] = useState(defaultJob);
  const { toast } = useToast();

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
    toast({ title: "Job saved!" });
  }

  async function sendReviewRequest() {
    setReviewLoading(true);
    await base44.functions.invoke("sendReviewRequest", { job_id: id });
    setReviewLoading(false);
    toast({ title: "Review request sent!" });
  }

  async function generateInvoice(collectPayment = false) {
    setInvoiceActionLoading(true);
    let line_items = form.line_items || [];
    let subtotal = form.total_amount || 0;
    if (job.estimate_id && line_items.length === 0) {
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
      tax_rate: form.tax_rate || 0,
      tax_amount: subtotal * ((form.tax_rate || 0) / 100),
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
    navigate(`/InvoiceDetail/${invoice.id}`);
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!job) return <div className="p-6 text-center text-slate-500">Job not found.</div>;

  const customer = customers.find(c => c.id === form.customer_id);

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
              <Badge className={`text-xs border ${STATUS_COLORS[form.status] || "bg-gray-100 text-gray-600"}`}>
                {form.status?.replace("_", " ")}
              </Badge>
              {form.priority === "urgent" && <Badge className="text-xs bg-red-100 text-red-700 border-red-200 border">Urgent</Badge>}
              {form.scheduled_start && (
                <span className="text-xs text-slate-400">
                  {format(new Date(form.scheduled_start), "EEE MMM d · h:mm a")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {form.status === "completed" && (
            <>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => sendReviewRequest()} disabled={reviewLoading}>
                <Star className="w-3.5 h-3.5 text-amber-500" />{reviewLoading ? "Sending..." : "Review"}
              </Button>
              <Button size="sm" className="gap-1 text-xs bg-violet-600 hover:bg-violet-700" onClick={() => generateInvoice(true)} disabled={invoiceActionLoading}>
                <CreditCard className="w-3.5 h-3.5" /> Collect Payment
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Left Sidebar */}
        <JobSidebar
          job={job}
          form={form}
          setForm={setForm}
          customers={customers}
          onSave={handleSave}
          saving={saving}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile customer info */}
          <div className="lg:hidden bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 text-sm">
            <span className="text-slate-600">{customer ? `${customer.first_name} ${customer.last_name}` : "No customer"}</span>
            {form.scheduled_start && <span className="text-slate-400">{format(new Date(form.scheduled_start), "MMM d")}</span>}
            {form.total_amount > 0 && <span className="font-semibold text-slate-900">${form.total_amount.toLocaleString()}</span>}
          </div>

          {/* Appointment */}
          <JobAppointmentSection form={form} setForm={setForm} onSave={handleSave} saving={saving} />

          {/* Field Tech Status */}
          <JobFieldTechSection form={form} setForm={setForm} techs={techs} onSave={handleSave} />

          {/* Invoice Section */}
          <JobInvoiceSection
            jobId={id}
            companyId={activeCompany?.id}
            customerId={form.customer_id}
            onGenerateInvoice={() => generateInvoice(false)}
            invoiceLoading={invoiceActionLoading}
          />

          {/* Line Items */}
          <JobLineItemsSection
            form={form}
            setForm={setForm}
            companyId={activeCompany?.id}
            onSave={handleSave}
          />

          {/* Notes */}
          <JobNotesSection
            job={job}
            customer={customer}
            onInternalNoteAdded={(log) => setJob(j => ({ ...j, internal_notes_log: log }))}
            onCustomerNoteAdded={(notes) => setJob(j => ({ ...j, customer_notes: notes }))}
          />
        </div>
      </div>
    </div>
  );
}