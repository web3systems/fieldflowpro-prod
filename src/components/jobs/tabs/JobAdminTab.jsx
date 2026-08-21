import { format } from "date-fns";
import { FileText, ChevronRight, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import JobLineItemsSection from "@/components/jobs/JobLineItemsSection";
import JobCostingSection from "@/components/jobs/JobCostingSection";
import JobMarginReview from "@/components/jobs/JobMarginReview";
import JobProfitSummary from "@/components/jobs/JobProfitSummary";
import JobInvoiceSection from "@/components/jobs/JobInvoiceSection";
import JobDepositStatus from "@/components/jobs/JobDepositStatus";

export default function JobAdminTab({ ctx }) {
  const {
    id, job, form, setForm, customer, activeCompany,
    existingInvoices, marginRule, depositData, setDepositData,
    setJob, generateInvoice, invoiceActionLoading,
    setShowDepositModal, navigate, linkedEstimate, jobPayments,
  } = ctx;

  return (
    <div className="space-y-4">
      {/* Line items */}
      <JobLineItemsSection
        form={form}
        setForm={setForm}
        companyId={activeCompany?.id}
        onSave={ctx.onSave}
        onGenerateInvoice={generateInvoice}
        invoiceLoading={invoiceActionLoading}
      />

      {/* Job costing breakdown */}
      <JobCostingSection form={form} receipts={job?.receipts || []} />

      {/* Margin review */}
      <JobMarginReview job={job} company={activeCompany} marginRule={marginRule} />

      {/* Profit summary */}
      <JobProfitSummary invoices={existingInvoices} form={form} marginRule={marginRule} />

      {/* Estimate + deposit request */}
      {job?.estimate_id && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="mb-3">
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

      {/* Deposit status / request */}
      {(() => {
        const dep = depositData || {};
        const hasDeposit = dep.deposit_status;
        const hasLineItems = (form.line_items || []).length > 0;
        if (hasDeposit) {
          return (
            <JobDepositStatus
              job={{ ...job, ...dep }}
              onDepositUpdated={(updated) => {
                setDepositData({ deposit_amount: updated.deposit_amount, deposit_status: updated.deposit_status, deposit_paid_date: updated.deposit_paid_date, deposit_stripe_link: updated.deposit_stripe_link });
                setJob(j => ({ ...j, ...updated }));
                setForm(f => ({ ...f, line_items: updated.line_items || f.line_items, total_amount: updated.total_amount ?? f.total_amount, deposit_status: "paid", deposit_paid_date: updated.deposit_paid_date }));
              }}
            />
          );
        }
        if (hasLineItems) {
          return (
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Deposit</p>
                <p className="text-xs text-slate-400">No deposit collected yet</p>
              </div>
              <button
                onClick={() => setShowDepositModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" /> Request Deposit
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Invoice section */}
      <JobInvoiceSection
        jobId={id}
        companyId={activeCompany?.id}
        customerId={form.customer_id}
        onGenerateInvoice={generateInvoice}
        invoiceLoading={invoiceActionLoading}
      />

      {/* Internal notes log (audit trail) */}
      {(job?.internal_notes_log?.length > 0 || job?.internal_notes) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Internal Notes Log</h3>
          <div className="space-y-2">
            {(!job?.internal_notes_log?.length && job?.internal_notes) && (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="whitespace-pre-wrap">{job.internal_notes}</p>
              </div>
            )}
            {(job?.internal_notes_log || []).map((e, i) => (
              <div key={i} className="text-sm bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-600">{e.created_by}</span>
                  <span className="text-xs text-slate-400">{e.created_at ? format(new Date(e.created_at), "MMM d, yyyy · h:mm a") : ""}</span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{e.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment records for this job */}
      {jobPayments?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Payment Records</h3>
          <div className="space-y-2">
            {jobPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 capitalize">
                    {p.payment_type ? `${p.payment_type} · ` : ""}{p.payment_method || "Payment"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.received_date ? format(new Date(p.received_date), "MMM d, yyyy") : ""}
                    {p.recorded_by ? ` · by ${p.recorded_by}` : ""}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold text-green-600 ml-3">${(p.amount || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}