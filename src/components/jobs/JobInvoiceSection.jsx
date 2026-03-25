import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { FileText, Send, ChevronDown, ChevronUp, Plus, ExternalLink, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  paid: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-gray-100 text-gray-500",
};

export default function JobInvoiceSection({ jobId, companyId, customerId, onGenerateInvoice, invoiceLoading }) {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [paymentsExpanded, setPaymentsExpanded] = useState(true);

  useEffect(() => {
    if (jobId) {
      base44.entities.Invoice.filter({ job_id: jobId }).then(invs => {
        setInvoices(invs);
      }).catch(() => {});
    }
  }, [jobId]);

  return (
    <>
      {/* Invoice Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">
              {invoices.length > 0 ? `Invoice #${invoices[invoices.length - 1].invoice_number || invoices[invoices.length-1].id?.slice(-4)}` : "Invoice"}
            </h3>
            {invoices.length > 0 && (
              <Badge className={`text-xs ${STATUS_COLORS[invoices[invoices.length-1].status] || "bg-slate-100 text-slate-500"}`}>
                {invoices[invoices.length-1].status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {invoices.length > 0 && (
              <Link to={`/InvoiceDetail/${invoices[invoices.length-1].id}`} onClick={e => e.stopPropagation()}>
                <Button size="sm" className="h-7 text-xs gap-1 bg-slate-800 hover:bg-slate-900">
                  <ExternalLink className="w-3 h-3" /> View Invoice
                </Button>
              </Link>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); onGenerateInvoice(); }}>
              <Plus className="w-3 h-3" /> {invoices.length > 0 ? "New Invoice" : "Create Invoice"}
            </Button>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-slate-100 px-5 py-4">
            {invoices.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No invoice created for this job yet.</p>
            ) : (
              <div className="space-y-3">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-slate-700">
                        {inv.invoice_number} — <span className="text-slate-500">${(inv.total || 0).toFixed(2)}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Due: {inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "Upon receipt"} &nbsp;·&nbsp;
                        Paid: ${(inv.amount_paid || 0).toFixed(2)}
                      </p>
                    </div>
                    <Badge className={`text-xs ${STATUS_COLORS[inv.status] || "bg-slate-100"}`}>{inv.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment History Section */}
      {invoices.some(inv => inv.amount_paid > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setPaymentsExpanded(!paymentsExpanded)}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <h3 className="font-semibold text-slate-800">Payment history</h3>
            </div>
            {paymentsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
          {paymentsExpanded && (
            <div className="border-t border-slate-100">
              <div className="grid grid-cols-4 px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <div>Date</div>
                <div>Type</div>
                <div>Amount</div>
                <div>Note</div>
              </div>
              {invoices.filter(inv => inv.amount_paid > 0).map(inv => (
                <div key={inv.id} className="grid grid-cols-4 px-5 py-3 text-sm border-b border-slate-50 last:border-0">
                  <div className="text-slate-600">{inv.paid_date ? format(new Date(inv.paid_date), "MMM d, yy") : "—"}</div>
                  <div className="text-slate-600">{inv.payment_method || "—"}</div>
                  <div className="text-green-600 font-medium">${(inv.amount_paid || 0).toFixed(2)}</div>
                  <div className="text-slate-400">{inv.invoice_number}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}