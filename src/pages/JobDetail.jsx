import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Briefcase, Star, CreditCard, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import JobSidebar from "@/components/jobs/JobSidebar";
import AttachDocumentModal from "@/components/jobs/AttachDocumentModal";
import DepositRequestModal from "@/components/jobs/DepositRequestModal";
import RequestReviewModal from "@/components/reviews/RequestReviewModal";
import JobOverviewTab from "@/components/jobs/tabs/JobOverviewTab";
import JobWorkTab from "@/components/jobs/tabs/JobWorkTab";
import JobSchedulingTab from "@/components/jobs/tabs/JobSchedulingTab";
import JobAdminTab from "@/components/jobs/tabs/JobAdminTab";

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  scheduled: "bg-purple-100 text-purple-700 border-purple-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  on_hold: "bg-gray-100 text-gray-700 border-gray-200",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "work", label: "Work" },
  { id: "scheduling", label: "Scheduling" },
  { id: "admin", label: "Admin" },
];

const defaultJob = {
  title: "", description: "", status: "new", priority: "medium",
  address: "", city: "", state: "", zip: "",
  scheduled_start: "", scheduled_end: "",
  customer_id: "", service_type: "", notes: "", internal_notes: "",
  total_amount: 0, line_items: [], tax_rate: 0, discount: 0,
  assigned_techs: [], tags: [], appointments: [],
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeCompany, user } = useApp();

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
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [marginRule, setMarginRule] = useState(null);
  const [depositData, setDepositData] = useState(null); // tracks deposit state locally
  const [jobPayments, setJobPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
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
      setDepositData({ deposit_amount: j.deposit_amount, deposit_status: j.deposit_status, deposit_paid_date: j.deposit_paid_date, deposit_stripe_link: j.deposit_stripe_link });
      const invs = await base44.entities.Invoice.filter({ job_id: id });
      setExistingInvoices(invs);
      const pmts = await base44.entities.Payment.filter({ job_id: id }).catch(() => []);
      setJobPayments(pmts);
      if (j.estimate_id) {
        const ests = await base44.entities.Estimate.filter({ id: j.estimate_id });
        if (ests[0]) setLinkedEstimate(ests[0]);
      }
    }
    setCustomers(c);
    setTechs(t);
    setLoading(false);
    if (activeCompany) {
      base44.entities.MarginRule.filter({ company_id: activeCompany.id })
        .then(rules => setMarginRule(rules[0] || null))
        .catch(() => {});
    }
  }, [id, activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSave(statusOverride, extraData) {
    setSaving(true);
    try {
      let dataToSave;
      if (typeof statusOverride === 'string') {
        dataToSave = { ...form, status: statusOverride, ...extraData };
      } else if (statusOverride && typeof statusOverride === 'object') {
        // Called with a data override object (e.g. from seedFromLegacy)
        dataToSave = { ...form, ...statusOverride };
      } else {
        dataToSave = form;
      }
      // Strip built-in fields that shouldn't be in the update payload
      const { id: _id, created_date, updated_date, created_by_id, ...updateData } = dataToSave;
      const oldStatus = job?.status;
      const newStatus = updateData.status;
      await base44.entities.Job.update(id, updateData);
      setJob(j => ({ ...j, ...updateData }));
      // Audit log for status changes
      if (oldStatus && newStatus && oldStatus !== newStatus) {
        base44.entities.AuditLog.create({
          company_id: activeCompany.id,
          action: "status_change",
          entity_type: "Job",
          entity_id: id,
          notes: `Status changed from "${oldStatus}" to "${newStatus}"`,
          performed_by_id: user?.id,
          performed_by_name: user?.full_name,
          performed_by_email: user?.email,
        }).catch(() => {});
      }
      toast({ title: "Job saved!" });
      // Prompt to generate invoice if just marked completed and no invoice exists
      if (statusOverride === "completed" && existingInvoices.length === 0) {
        setShowInvoicePrompt(true);
      }
    } catch (err) {
      console.error("Save failed:", err);
      toast({ title: "Failed to save job", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    await base44.entities.Job.delete(id);
    navigate(createPageUrl("Jobs"));
  }

  async function sendReviewRequest() {
    setReviewLoading(true);
    await base44.functions.invoke("sendReviewRequest", { job_id: id });
    setReviewLoading(false);
    toast({ title: "Review request sent!" });
  }

  async function generateInvoice(collectPayment = false) {
    setInvoiceActionLoading(true);

    // If an active (non-void) invoice already exists, confirm before voiding & regenerating
    const existingForJob = await base44.entities.Invoice.filter({ job_id: id });
    const activeInvoice = existingForJob.find(inv => inv.status !== "void");
    if (activeInvoice && !collectPayment) {
      const proceed = window.confirm(
        `An active invoice (${activeInvoice.invoice_number || "#" + activeInvoice.id.slice(-4)}) already exists.\n\nClick OK to void it and generate a new invoice from the current line items, or Cancel to view the existing invoice.`
      );
      if (!proceed) {
        setInvoiceActionLoading(false);
        navigate(`/InvoiceDetail/${activeInvoice.id}`);
        return;
      }
      await base44.entities.Invoice.update(activeInvoice.id, { status: "void" }).catch(() => {});
    }

    let line_items = form.line_items || [];
    let subtotal = form.total_amount || 0;
    if (job.estimate_id && line_items.length === 0) {
      const ests = await base44.entities.Estimate.filter({ id: job.estimate_id });
      if (ests[0]) {
        const est = ests[0];
        const opt = est.options?.[0];
        line_items = opt?.line_items || est.line_items || [];
        subtotal = opt?.subtotal || est.subtotal || opt?.total || est.total || 0;
      }
    }
    if (line_items.length === 0 && form.total_amount) {
      line_items = [{ description: form.title, quantity: 1, unit_price: form.total_amount, total: form.total_amount }];
    }

    // Load ledger payments already made for this job — deposits, partials, etc.
    // These are reflected in amount_paid on the invoice, NOT as negative line items,
    // so the invoice total stays as the full job value and the balance is correct.
    const existingPayments = await base44.entities.Payment.filter({ job_id: id }).catch(() => []);
    const totalAlreadyPaid = existingPayments.reduce((s, p) => s + (p.amount || 0), 0);

    const invoiceTotal = form.total_amount || subtotal;
    const allInv = await base44.entities.Invoice.list();
    const invoice_number = `INV-${String((allInv.length || 0) + 1).padStart(4, "0")}`;
    const newStatus = totalAlreadyPaid >= invoiceTotal ? "paid" : totalAlreadyPaid > 0 ? "partial" : "sent";

    const invoice = await base44.entities.Invoice.create({
      company_id: activeCompany.id,
      customer_id: form.customer_id,
      job_id: id,
      estimate_id: job.estimate_id || "",
      invoice_number,
      status: newStatus,
      line_items,
      subtotal,
      tax_rate: form.tax_rate || 0,
      tax_amount: Number((subtotal * ((form.tax_rate || 0) / 100)).toFixed(2)),
      discount: form.discount || 0,
      total: Number(invoiceTotal.toFixed(2)),
      amount_paid: totalAlreadyPaid,
      ...(newStatus === "paid" ? { paid_date: new Date().toISOString().split("T")[0] } : {}),
    });

    // Link any unlinked job Payment records to this new invoice
    await Promise.all(
      existingPayments
        .filter(p => !p.invoice_id)
        .map(p => base44.entities.Payment.update(p.id, { invoice_id: invoice.id }))
    ).catch(() => {});

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

  const ctx = {
    id, job, form, setForm, customers, customer, techs,
    onSave: handleSave, saving,
    activeCompany, existingInvoices, marginRule, linkedEstimate,
    depositData, setDepositData, setShowDepositModal,
    generateInvoice: () => generateInvoice(false),
    collectPayment: () => generateInvoice(true),
    invoiceActionLoading, setJob, navigate, jobPayments,
  };

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
          <Button size="sm" variant="outline" className="gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowAttachModal(true)}>
            <FileText className="w-3.5 h-3.5" /> Attach
          </Button>
          {form.status === "completed" && (
            <>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowReviewModal(true)}>
                <Star className="w-3.5 h-3.5 text-amber-500" /> Review
              </Button>
              <Button size="sm" className="gap-1 text-xs bg-violet-600 hover:bg-violet-700" onClick={() => generateInvoice(true)} disabled={invoiceActionLoading}>
                <CreditCard className="w-3.5 h-3.5" /> Collect Payment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Review Request Modal */}
      <RequestReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        customer={customer}
        job={job}
        company={activeCompany}
      />

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

      {/* Deposit Modal */}
      {showDepositModal && (
        <DepositRequestModal
          job={{ ...job, ...form }}
          customer={customer}
          onClose={() => setShowDepositModal(false)}
          onDepositRequested={(data) => {
            setDepositData(data);
            setJob(j => ({ ...j, ...data }));
            toast({ title: `Deposit of $${data.deposit_amount?.toFixed(2)} requested!` });
          }}
        />
      )}

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
          onStatusChange={(s) => handleSave(s)}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && <JobOverviewTab ctx={ctx} />}
          {activeTab === "work" && <JobWorkTab ctx={ctx} />}
          {activeTab === "scheduling" && <JobSchedulingTab ctx={ctx} />}
          {activeTab === "admin" && <JobAdminTab ctx={ctx} />}
        </div>
      </div>
    </div>
  );
}