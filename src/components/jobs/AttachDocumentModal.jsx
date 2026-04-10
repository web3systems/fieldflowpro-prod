import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Link2 } from "lucide-react";
import { format } from "date-fns";

const ESTIMATE_STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

const INVOICE_STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

export default function AttachDocumentModal({ open, onClose, jobId, customerId, companyId, currentEstimateId, onAttached }) {
  const [tab, setTab] = useState("estimate");
  const [estimates, setEstimates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attaching, setAttaching] = useState(null);

  useEffect(() => {
    if (!open || !customerId) return;
    Promise.all([
      base44.entities.Estimate.filter({ customer_id: customerId, company_id: companyId }),
      base44.entities.Invoice.filter({ customer_id: customerId, company_id: companyId }),
    ]).then(([ests, invs]) => {
      setEstimates(ests);
      setInvoices(invs);
    });
  }, [open, customerId, companyId]);

  async function attachEstimate(est) {
    setAttaching(est.id);
    await base44.entities.Job.update(jobId, { estimate_id: est.id });
    onAttached("estimate", est);
    setAttaching(null);
    onClose();
  }

  async function attachInvoice(inv) {
    setAttaching(inv.id);
    await base44.entities.Invoice.update(inv.id, { job_id: jobId });
    onAttached("invoice", inv);
    setAttaching(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-500" />
            Attach to Job
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-4">
          <button
            onClick={() => setTab("estimate")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "estimate" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <FileText className="w-4 h-4 inline mr-1.5" />Estimates
          </button>
          <button
            onClick={() => setTab("invoice")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "invoice" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <DollarSign className="w-4 h-4 inline mr-1.5" />Invoices
          </button>
        </div>

        {tab === "estimate" && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {estimates.length === 0 && <p className="text-sm text-slate-400 italic py-4 text-center">No estimates found for this customer.</p>}
            {estimates.map(est => (
              <div key={est.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{est.title || est.estimate_number || "Estimate"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {est.estimate_number && <span className="text-xs text-slate-400">#{est.estimate_number}</span>}
                    <Badge className={`text-xs ${ESTIMATE_STATUS_COLORS[est.status] || "bg-slate-100 text-slate-500"}`}>{est.status}</Badge>
                    {est.total > 0 && <span className="text-xs text-slate-500">${(est.total || 0).toFixed(2)}</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => attachEstimate(est)}
                  disabled={attaching === est.id || currentEstimateId === est.id}
                  className="ml-3 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  {currentEstimateId === est.id ? "Attached" : attaching === est.id ? "Attaching..." : "Attach"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {tab === "invoice" && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {invoices.length === 0 && <p className="text-sm text-slate-400 italic py-4 text-center">No invoices found for this customer.</p>}
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{inv.invoice_number || "Invoice"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-xs ${INVOICE_STATUS_COLORS[inv.status] || "bg-slate-100 text-slate-500"}`}>{inv.status}</Badge>
                    <span className="text-xs text-slate-500">${(inv.total || 0).toFixed(2)}</span>
                    {inv.job_id && inv.job_id !== jobId && <span className="text-xs text-amber-500">Linked to another job</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => attachInvoice(inv)}
                  disabled={attaching === inv.id || inv.job_id === jobId}
                  className="ml-3 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  {inv.job_id === jobId ? "Attached" : attaching === inv.id ? "Attaching..." : "Attach"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}