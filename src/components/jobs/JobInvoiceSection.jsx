import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/Layout";
import { FileText, Send, ChevronDown, ChevronUp, Plus, ExternalLink, DollarSign, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import RecordPaymentModal from "@/components/invoices/RecordPaymentModal";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  paid: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-gray-100 text-gray-500",
};

const METHOD_LABELS = {
  cash: "Cash", check: "Check", card: "Card", stripe: "Stripe",
  venmo: "Venmo", zelle: "Zelle", bank_transfer: "Bank Transfer", other: "Other",
};

export default function JobInvoiceSection({ jobId, companyId, customerId, onGenerateInvoice, invoiceLoading }) {
  const { activeCompany } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [paymentsExpanded, setPaymentsExpanded] = useState(true);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  async function loadAll() {
    if (!jobId) return;
    const [invs, pmts] = await Promise.all([
      base44.entities.Invoice.filter({ job_id: jobId }).catch(() => []),
      base44.entities.Payment.filter({ job_id: jobId }).catch(() => []),
    ]);
    setInvoices(invs);
    setPayments(pmts);
  }

  useEffect(() => { loadAll(); }, [jobId]);

  const latestInvoice = invoices[invoices.length - 1];
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balanceDue = latestInvoice ? Math.max(0, (latestInvoice.total || 0) - totalPaid) : 0;

  return (
    <>
      {showRecordPayment && latestInvoice && (
        <RecordPaymentModal
          invoice={{ ...latestInvoice, amount_paid: totalPaid }}
          onClose={() => setShowRecordPayment(false)}
          onSaved={() => { setShowRecordPayment(false); loadAll(); }}
        />
      )}

      {/* Invoice Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">
              {latestInvoice ? `Invoice #${latestInvoice.invoice_number || latestInvoice.id?.slice(-4)}` : "Invoice"}
            </h3>
            {latestInvoice && (
              <Badge className={`text-xs ${STATUS_COLORS[latestInvoice.status] || "bg-slate-100 text-slate-500"}`}>
                {latestInvoice.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {latestInvoice && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                  onClick={e => { e.stopPropagation(); setShowRecordPayment(true); }}
                >
                  <Banknote className="w-3 h-3" /> Record Payment
                </Button>
                <Link to={`/InvoiceDetail/${latestInvoice.id}`} onClick={e => e.stopPropagation()}>
                  <Button size="sm" className="h-7 text-xs gap-1 bg-slate-800 hover:bg-slate-900">
                    <ExternalLink className="w-3 h-3" /> View Invoice
                  </Button>
                </Link>
              </>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); onGenerateInvoice(); }}>
              <Plus className="w-3 h-3" /> {latestInvoice ? "New Invoice" : "Create Invoice"}
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
                        Due: {inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "Upon receipt"}
                        {totalPaid > 0 && <> &nbsp;·&nbsp; <span className="text-green-600">Paid: ${totalPaid.toFixed(2)}</span></>}
                        {balanceDue > 0 && <> &nbsp;·&nbsp; <span className="text-red-500">Balance: ${balanceDue.toFixed(2)}</span></>}
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
      {payments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setPaymentsExpanded(!paymentsExpanded)}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <h3 className="font-semibold text-slate-800">Payment History</h3>
              <span className="text-xs text-green-600 font-medium">${totalPaid.toFixed(2)} received</span>
            </div>
            {paymentsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
          {paymentsExpanded && (
            <div className="border-t border-slate-100">
              <div className="grid grid-cols-4 px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <div>Date</div>
                <div>Method</div>
                <div>Type</div>
                <div>Amount</div>
              </div>
              {payments.sort((a, b) => new Date(a.received_date) - new Date(b.received_date)).map(p => (
                <div key={p.id} className="grid grid-cols-4 px-5 py-3 text-sm border-b border-slate-50 last:border-0">
                  <div className="text-slate-600">{p.received_date ? format(new Date(p.received_date), "MMM d, yy") : "—"}</div>
                  <div className="text-slate-600">{METHOD_LABELS[p.payment_method] || p.payment_method || "—"}</div>
                  <div className="text-slate-500 capitalize">{p.payment_type || "—"}</div>
                  <div className="text-green-600 font-medium">${(p.amount || 0).toFixed(2)}</div>
                </div>
              ))}
              {balanceDue > 0 && (
                <div className="px-5 py-3 bg-red-50 flex justify-between text-sm font-semibold text-red-700 border-t border-red-100">
                  <span>Balance Due</span>
                  <span>${balanceDue.toFixed(2)}</span>
                </div>
              )}
              {balanceDue <= 0 && latestInvoice && (
                <div className="px-5 py-3 bg-green-50 flex justify-between text-sm font-semibold text-green-700 border-t border-green-100">
                  <span>Paid in Full</span>
                  <span>✓</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}