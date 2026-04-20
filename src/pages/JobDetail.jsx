import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Briefcase, Star, CreditCard, FileText, Phone, Mail, MapPin, ExternalLink, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import JobSidebar from "@/components/jobs/JobSidebar";
import JobWorkflowBar from "@/components/jobs/JobWorkflowBar";
import JobAppointmentSection from "@/components/jobs/JobAppointmentSection";
import JobFieldTechSection from "@/components/jobs/JobFieldTechSection";
import JobLineItemsSection from "@/components/jobs/JobLineItemsSection";
import JobInvoiceSection from "@/components/jobs/JobInvoiceSection";
import JobNotesSection from "@/components/jobs/JobNotesSection";
import JobPhotosSection from "@/components/jobs/JobPhotosSection";
import JobCostingSection from "@/components/jobs/JobCostingSection";
import JobActivityFeed from "@/components/jobs/JobActivityFeed";
import AttachDocumentModal from "@/components/jobs/AttachDocumentModal";

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
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [linkedEstimate, setLinkedEstimate] = useState(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    const [jobs, c, t] = await Promise.all([
      base44.entities.Job.filter({ id }),
      activeCompany ? base44.entities.Customer.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
      activeCompany ? base44.entities.Technician.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
    ]);
    if (jobs.length > 0) {
      const j = jobs[0];
      setJob(j);
      setForm({ ...defaultJob, ...j });
      const invs = await base44.entities.Invoice.filter({ job_id: id });
      setExistingInvoices(invs);
      if (j.estimate_id) {
        const ests = await base44.entities.Estimate.filter({ id: j.estimate_id });
        if (ests[0]) setLinkedEstimate(ests[0]);
      }
    }
    setCustomers(c);
    setTechs(t);
    setLoading(false);
  }, [id, activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSave(statusOverride) {
    setSaving(true);
    const dataToSave = statusOverride ? { ...form, status: statusOverride } : form;
    await base44.entities.Job.update(id, dataToSave);
    setJob(j => ({ ...j, ...dataToSave }));
    setSaving(false);
    toast({ title: "Job saved!" });
    // Prompt to generate invoice if just marked completed and no invoice exists
    if (statusOverride === "completed" && existingInvoices.length === 0) {
      setShowInvoicePrompt(true);
    }
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
      if (ests[0]) {
        const est = ests[0];
        // Support both multi-option and legacy flat structure
        const opt = est.options?.[0];
        line_items = opt?.line_items || est.line_items || [];
        subtotal = opt?.subtotal || est.subtotal || opt?.total || est.total || 0;
      }
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
    setExistingInvoices(prev => [...prev, invoice]);
    setShowInvoicePrompt(false);
    navigate(`/InvoiceDetail/${invoice.id}`);
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!job) return (
    <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-4 pt-20">
      <p>Job not found.</p>
      <button onClick={() => navigate(createPageUrl("Jobs"))} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
        Back to Jobs
      </button>
    </div>
  );

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
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowAttachModal(true)}>
            <FileText className="w-3.5 h-3.5" /> Attach
          </Button>
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

      {/* Attach Document Modal */}
      <AttachDocumentModal
        open={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        jobId={id}
        customerId={form.customer_id}
        companyId={activeCompany?.id}
        currentEstimateId={job?.estimate_id}
        onAttached={(type, doc) => {
          if (type === "estimate") setJob(j => ({ ...j, estimate_id: doc.id }));
          else setExistingInvoices(prev => [...prev.filter(i => i.id !== doc.id), doc]);
          toast({ title: `${type === "estimate" ? "Estimate" : "Invoice"} attached successfully!` });
        }}
      />

      {/* Invoice prompt banner */}
      {showInvoicePrompt && (
        <div className="mb-5 flex items-center justify-between gap-4 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800 text-sm">Job marked as completed!</p>
              <p className="text-green-700 text-xs">Would you like to generate an invoice now?</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="text-xs border-green-300 text-green-700 hover:bg-green-100" onClick={() => setShowInvoicePrompt(false)}>
              Not now
            </Button>
            <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700 gap-1" onClick={() => generateInvoice(false)} disabled={invoiceActionLoading}>
              <FileText className="w-3.5 h-3.5" /> {invoiceActionLoading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </div>
      )}

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
          <div className="lg:hidden bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800 text-sm">{customer ? (customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim()) : "No customer"}</p>
              {customer && <Link to={`/CustomerDetail/${customer.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">Profile <ExternalLink className="w-3 h-3" /></Link>}
            </div>
            {customer?.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Phone className="w-3 h-3" />{customer.phone}</a>}
            {customer?.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Mail className="w-3 h-3" />{customer.email}</a>}
            {customer?.address && <p className="text-xs text-slate-600 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />{customer.address}{customer.city ? `, ${customer.city}` : ""}{customer.state ? `, ${customer.state}` : ""} {customer.zip || ""}</p>}
            {form.scheduled_start && <p className="text-xs text-slate-400">Scheduled: {format(new Date(form.scheduled_start), "MMM d, yyyy · h:mm a")}</p>}
            {form.total_amount > 0 && <p className="text-sm font-semibold text-slate-900">${form.total_amount.toLocaleString()}</p>}
          </div>

          {/* Workflow Pipeline */}
          <JobWorkflowBar
            job={job}
            form={form}
            onSave={handleSave}
            onGenerateInvoice={() => generateInvoice(false)}
            onCollectPayment={() => generateInvoice(true)}
            invoiceLoading={invoiceActionLoading}
          />

          {/* Appointment */}
          <JobAppointmentSection form={form} setForm={setForm} onSave={handleSave} saving={saving} />

          {/* Field Tech Status */}
          <JobFieldTechSection form={form} setForm={setForm} techs={techs} onSave={handleSave} />

          {/* Estimate Section */}
          {job?.estimate_id && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" /> Estimate
                </h3>
              </div>
              {linkedEstimate ? (
                <div
                  onClick={() => navigate(`/EstimateDetail/${linkedEstimate.id}`)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{linkedEstimate.title || linkedEstimate.estimate_number || "Estimate"}</p>
                    <p className="text-xs text-slate-400">{format(new Date(linkedEstimate.created_date), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge className={`text-xs ${linkedEstimate.status === "approved" ? "bg-green-100 text-green-700" : linkedEstimate.status === "declined" ? "bg-red-100 text-red-700" : linkedEstimate.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {linkedEstimate.status}
                    </Badge>
                    {linkedEstimate.total > 0 && <span className="text-xs font-semibold text-slate-700">${linkedEstimate.total.toLocaleString()}</span>}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-2">Loading estimate...</p>
              )}
            </div>
          )}

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

          {/* Job Costing Breakdown */}
          <JobCostingSection form={form} />

          {/* Before & After Photos */}
          <JobPhotosSection
            job={job}
            onPhotosUpdated={(field, updated) => setJob(j => ({ ...j, [field]: updated }))}
          />

          {/* Notes */}
          <JobNotesSection
            job={job}
            customer={customer}
            onInternalNoteAdded={(log) => setJob(j => ({ ...j, internal_notes_log: log }))}
            onCustomerNoteAdded={(notes) => setJob(j => ({ ...j, customer_notes: notes }))}
          />

          {/* Activity Feed */}
          <JobActivityFeed job={job} form={form} customer={customer} techs={techs} />
        </div>
      </div>
    </div>
  );
}