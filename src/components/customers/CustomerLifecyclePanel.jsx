import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Briefcase, DollarSign, CreditCard, Plus, ChevronRight, ArrowRight, Link2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const fmtMoney = (n) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const estStatusColor = {
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  closed: "bg-purple-100 text-purple-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-indigo-100 text-indigo-700",
  draft: "bg-gray-100 text-gray-600",
};

const jobStatusColor = {
  completed: "bg-green-100 text-green-700",
  in_progress: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  on_hold: "bg-orange-100 text-orange-700",
  scheduled: "bg-blue-100 text-blue-700",
  estimated: "bg-cyan-100 text-cyan-700",
  invoiced: "bg-purple-100 text-purple-700",
  new: "bg-slate-100 text-slate-600",
};

const invStatusColor = {
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-indigo-100 text-indigo-700",
  partial: "bg-amber-100 text-amber-700",
  draft: "bg-gray-100 text-gray-600",
  void: "bg-gray-100 text-gray-500",
};

const TABS = [
  { key: "pipeline", label: "Pipeline", icon: ArrowRight },
  { key: "estimates", label: "Estimates", icon: FileText },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "invoices", label: "Invoices", icon: DollarSign },
  { key: "payments", label: "Payments", icon: CreditCard },
];

function SummaryCard({ icon: Icon, label, count, value, accent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white hover:shadow-sm transition-shadow text-left flex-1 min-w-0 ${accent.border}`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent.bg} ${accent.text}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className="text-sm font-bold text-slate-800">
          {count} {count === 1 ? "item" : "items"}
          {value > 0 && <span className="ml-1.5 text-slate-500 font-normal">· ${fmtMoney(value)}</span>}
        </p>
      </div>
    </button>
  );
}

function Row({ onClick, title, subtitle, badge, badgeClass, amount, rightLabel }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        {rightLabel && <span className="text-xs text-slate-400 hidden sm:inline">{rightLabel}</span>}
        {amount > 0 && <span className="text-sm font-semibold text-slate-700">${fmtMoney(amount)}</span>}
        <Badge className={`text-xs ${badgeClass}`}>{badge}</Badge>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </div>
  );
}

export default function CustomerLifecyclePanel({ customer, estimates, jobs, invoices, payments, onAssign }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pipeline");
  const cid = customer.id;

  const sortedEstimates = useMemo(() => [...estimates].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), [estimates]);
  const sortedJobs = useMemo(() => [...jobs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), [jobs]);
  const sortedInvoices = useMemo(() => [...invoices].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), [invoices]);

  const estTotal = sortedEstimates.reduce((s, e) => s + (e.total || 0), 0);
  const jobTotal = sortedJobs.reduce((s, j) => s + (j.total_amount || 0), 0);
  const invTotal = sortedInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const invPaid = sortedInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const outstanding = invTotal - invPaid;

  const goNew = (page) => navigate(createPageUrl(`${page}?customer_id=${cid}`));

  // Build pipeline chains: estimate → job(s) → invoice(s)
  const chains = useMemo(() => {
    const map = new Map();
    // Seed from estimates
    sortedEstimates.forEach(e => {
      map.set(e.id, { estimate: e, jobs: [], invoices: [] });
    });
    // Attach jobs
    sortedJobs.forEach(j => {
      if (j.estimate_id && map.has(j.estimate_id)) {
        map.get(j.estimate_id).jobs.push(j);
      } else {
        // orphan job — its own chain
        map.set(`job-${j.id}`, { estimate: null, jobs: [j], invoices: [] });
      }
    });
    // Attach invoices to jobs
    sortedInvoices.forEach(inv => {
      if (inv.job_id) {
        const chain = [...map.values()].find(c => c.jobs.some(j => j.id === inv.job_id));
        if (chain) chain.invoices.push(inv);
        else {
          // invoice with job_id but no chain yet — shouldn't happen often
          map.set(`inv-${inv.id}`, { estimate: null, jobs: [], invoices: [inv] });
        }
      } else if (inv.estimate_id && map.has(inv.estimate_id)) {
        map.get(inv.estimate_id).invoices.push(inv);
      } else {
        map.set(`inv-${inv.id}`, { estimate: null, jobs: [], invoices: [inv] });
      }
    });
    return [...map.values()];
  }, [sortedEstimates, sortedJobs, sortedInvoices]);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Summary strip */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <SummaryCard
            icon={FileText} label="Estimates" count={sortedEstimates.length} value={estTotal}
            accent={{ border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-600" }}
            onClick={() => setTab("estimates")}
          />
          <SummaryCard
            icon={Briefcase} label="Jobs" count={sortedJobs.length} value={jobTotal}
            accent={{ border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-600" }}
            onClick={() => setTab("jobs")}
          />
          <SummaryCard
            icon={DollarSign} label="Invoices" count={sortedInvoices.length} value={invTotal}
            accent={{ border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-600" }}
            onClick={() => setTab("invoices")}
          />
          <SummaryCard
            icon={Wallet} label="Outstanding" count={outstanding > 0 ? 1 : 0} value={outstanding}
            accent={{ border: "border-red-200", bg: "bg-red-50", text: "text-red-600" }}
            onClick={() => setTab("payments")}
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 pt-2 border-b border-slate-100 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 py-1">
          <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => onAssign("estimate")}>
            <Link2 className="w-3.5 h-3.5" /> Link
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => goNew("NewEstimate")}>
            <Plus className="w-3.5 h-3.5" /> Estimate
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => goNew("NewEstimate")}>
            <Plus className="w-3.5 h-3.5" /> Job
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs gap-1" onClick={() => goNew("NewInvoice")}>
            <Plus className="w-3.5 h-3.5" /> Invoice
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4 space-y-2">
        {tab === "pipeline" && (
          chains.length === 0 ? (
            <EmptyState text="No records yet. Create an estimate, job, or invoice to get started." />
          ) : (
            chains.map((chain, i) => <PipelineChain key={i} chain={chain} navigate={navigate} />)
          )
        )}

        {tab === "estimates" && (
          sortedEstimates.length === 0 ? <EmptyState text="No estimates yet." /> : (
            sortedEstimates.map(est => (
              <Row
                key={est.id}
                onClick={() => navigate(`/EstimateDetail/${est.id}`)}
                title={est.title || est.estimate_number || "Estimate"}
                subtitle={format(new Date(est.created_date), "MMM d, yyyy")}
                badge={est.status}
                badgeClass={estStatusColor[est.status] || "bg-gray-100 text-gray-600"}
                amount={est.total}
              />
            ))
          )
        )}

        {tab === "jobs" && (
          sortedJobs.length === 0 ? <EmptyState text="No jobs yet." /> : (
            sortedJobs.map(job => (
              <Row
                key={job.id}
                onClick={() => navigate(`/JobDetail/${job.id}`)}
                title={job.title}
                subtitle={job.scheduled_start ? `Scheduled ${format(new Date(job.scheduled_start), "MMM d, yyyy")}` : format(new Date(job.created_date), "MMM d, yyyy")}
                badge={job.status?.replace("_", " ")}
                badgeClass={jobStatusColor[job.status] || "bg-slate-100 text-slate-600"}
                amount={job.total_amount}
              />
            ))
          )
        )}

        {tab === "invoices" && (
          sortedInvoices.length === 0 ? <EmptyState text="No invoices yet." /> : (
            sortedInvoices.map(inv => (
              <Row
                key={inv.id}
                onClick={() => navigate(`/InvoiceDetail/${inv.id}`)}
                title={`Invoice #${inv.invoice_number || inv.id.slice(-6)}`}
                subtitle={format(new Date(inv.created_date), "MMM d, yyyy")}
                badge={inv.status}
                badgeClass={invStatusColor[inv.status] || "bg-gray-100 text-gray-600"}
                amount={inv.total}
                rightLabel={inv.amount_paid > 0 ? `$${fmtMoney(inv.amount_paid)} paid` : null}
              />
            ))
          )
        )}

        {tab === "payments" && (
          payments.length === 0 ? <EmptyState text="No payments recorded yet." /> : (
            payments.map(pmt => {
              const inv = invoices.find(i => i.id === pmt.invoice_id);
              return (
                <div key={pmt.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-green-50/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      ${fmtMoney(pmt.amount)}
                      <span className="ml-2 text-xs font-normal text-slate-500 capitalize">{pmt.payment_type?.replace("_", " ")} · {pmt.payment_method}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {pmt.received_date ? format(new Date(pmt.received_date), "MMM d, yyyy") : "—"}
                      {inv && <span className="ml-2">· Invoice #{inv.invoice_number || inv.id.slice(-6)}</span>}
                      {pmt.recorded_by && <span className="ml-2">· by {pmt.recorded_by}</span>}
                    </p>
                  </div>
                  <Badge className="text-xs bg-green-100 text-green-700">Paid</Badge>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

function PipelineChain({ chain, navigate }) {
  const { estimate, jobs, invoices } = chain;
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {/* Estimate row */}
      {estimate && (
        <div
          onClick={() => navigate(`/EstimateDetail/${estimate.id}`)}
          className="flex items-center gap-3 p-3 bg-blue-50/40 hover:bg-blue-50 cursor-pointer border-b border-slate-100"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{estimate.title || estimate.estimate_number || "Estimate"}</p>
            <p className="text-xs text-slate-400">{format(new Date(estimate.created_date), "MMM d, yyyy")}</p>
          </div>
          <Badge className={`text-xs ${estStatusColor[estimate.status] || "bg-gray-100 text-gray-600"}`}>{estimate.status}</Badge>
          {estimate.total > 0 && <span className="text-sm font-semibold text-slate-700">${fmtMoney(estimate.total)}</span>}
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      )}

      {/* Jobs */}
      {jobs.map(job => (
        <div key={job.id}>
          {estimate && <div className="ml-6 h-3 w-px bg-slate-200" />}
          <div
            onClick={() => navigate(`/JobDetail/${job.id}`)}
            className="flex items-center gap-3 p-3 bg-amber-50/40 hover:bg-amber-50 cursor-pointer border-b border-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
              <p className="text-xs text-slate-400">
                {job.scheduled_start ? `Scheduled ${format(new Date(job.scheduled_start), "MMM d, yyyy")}` : format(new Date(job.created_date), "MMM d, yyyy")}
              </p>
            </div>
            <Badge className={`text-xs ${jobStatusColor[job.status] || "bg-slate-100 text-slate-600"}`}>{job.status?.replace("_", " ")}</Badge>
            {job.total_amount > 0 && <span className="text-sm font-semibold text-slate-700">${fmtMoney(job.total_amount)}</span>}
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </div>

          {/* Invoices under this job */}
          {invoices.filter(inv => inv.job_id === job.id).map(inv => (
            <div key={inv.id}>
              <div className="ml-6 h-3 w-px bg-slate-200" />
              <div
                onClick={() => navigate(`/InvoiceDetail/${inv.id}`)}
                className="flex items-center gap-3 p-3 bg-purple-50/40 hover:bg-purple-50 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">Invoice #{inv.invoice_number || inv.id.slice(-6)}</p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(inv.created_date), "MMM d, yyyy")}
                    {inv.amount_paid > 0 && <span className="ml-2">· ${fmtMoney(inv.amount_paid)} paid</span>}
                  </p>
                </div>
                <Badge className={`text-xs ${invStatusColor[inv.status] || "bg-gray-100 text-gray-600"}`}>{inv.status}</Badge>
                {inv.total > 0 && <span className="text-sm font-semibold text-slate-700">${fmtMoney(inv.total)}</span>}
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Orphan invoices (no job) */}
      {!estimate && jobs.length === 0 && invoices.map(inv => (
        <div
          key={inv.id}
          onClick={() => navigate(`/InvoiceDetail/${inv.id}`)}
          className="flex items-center gap-3 p-3 bg-purple-50/40 hover:bg-purple-50 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">Invoice #{inv.invoice_number || inv.id.slice(-6)}</p>
            <p className="text-xs text-slate-400">{format(new Date(inv.created_date), "MMM d, yyyy")}</p>
          </div>
          <Badge className={`text-xs ${invStatusColor[inv.status] || "bg-gray-100 text-gray-600"}`}>{inv.status}</Badge>
          {inv.total > 0 && <span className="text-sm font-semibold text-slate-700">${fmtMoney(inv.total)}</span>}
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-slate-400 py-8 text-center">{text}</p>;
}