import { format } from "date-fns";
import { DollarSign, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

const INV_STATUS = {
  sent: { label: "Unpaid", color: "bg-blue-100 text-blue-700" },
  viewed: { label: "Unpaid", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Paid", color: "bg-green-100 text-green-700" },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700" },
};

export default function PortalInvoices({ invoices, company }) {
  const accentColor = company?.primary_color || "#2563eb";
  const [expanded, setExpanded] = useState({});
  const [paying, setPaying] = useState({});

  async function handlePay(inv) {
    const isInIframe = window.self !== window.top;
    if (isInIframe) { alert("Payment only works from the published app."); return; }
    setPaying(p => ({ ...p, [inv.id]: true }));
    const base = window.location.href.split("?")[0];
    const res = await base44.functions.invoke("createStripeCheckout", {
      invoice_id: inv.id,
      success_url: `${base}?payment_success=true&invoice_id=${inv.id}`,
      cancel_url: `${base}?invoice_id=${inv.id}`,
    });
    if (res.data?.url) window.location.href = res.data.url;
    else { alert(res.data?.error || "Failed to start checkout."); setPaying(p => ({ ...p, [inv.id]: false })); }
  }

  const unpaid = invoices.filter(i => !["paid"].includes(i.status));
  const paid = invoices.filter(i => i.status === "paid");
  const sorted = [...unpaid, ...paid];
  const totalDue = unpaid.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.amount_paid || 0)), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 mb-5">Invoices</h1>

      {/* Balance summary */}
      {totalDue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 mb-5">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-slate-800 text-sm">Outstanding Balance</p>
            <p className="text-xs text-red-600">{unpaid.length} invoice{unpaid.length > 1 ? "s" : ""} pending payment</p>
          </div>
          <span className="text-xl font-bold text-red-600">${totalDue.toFixed(2)}</span>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(inv => {
            const s = INV_STATUS[inv.status] || INV_STATUS.sent;
            const canPay = !["paid"].includes(inv.status);
            const balance = (inv.total || 0) - (inv.amount_paid || 0);
            const isOpen = expanded[inv.id];

            return (
              <div key={inv.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${canPay ? "border-slate-200" : "border-slate-100"}`}>
                <button className="w-full text-left p-4" onClick={() => setExpanded(e => ({ ...e, [inv.id]: !e[inv.id] }))}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-slate-800 text-sm">{inv.invoice_number ? `Invoice #${inv.invoice_number}` : "Invoice"}</span>
                        <Badge className={`text-xs flex-shrink-0 ${s.color}`}>{s.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {inv.created_date ? format(new Date(inv.created_date), "MMM d, yyyy") : ""}
                          {inv.due_date ? ` · Due ${format(new Date(inv.due_date), "MMM d")}` : ""}
                        </span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-800">${(inv.total || 0).toFixed(2)}</span>
                          {inv.amount_paid > 0 && inv.status !== "paid" && (
                            <p className="text-xs text-green-600">${inv.amount_paid.toFixed(2)} paid</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 space-y-3">
                    {inv.line_items?.length > 0 && (
                      <div className="pt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Line Items</p>
                        <div className="space-y-1.5">
                          {inv.line_items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                              <span className="text-slate-700 flex-1 truncate">{item.description}</span>
                              <span className="font-semibold text-slate-800 ml-2">${(item.total || 0).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-semibold text-slate-800 px-3 py-2 border-t border-slate-200 mt-1">
                            <span>Total</span>
                            <span>${(inv.total || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {inv.notes && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{inv.notes}</p>
                      </div>
                    )}

                    {canPay && (
                      <button
                        onClick={() => handlePay(inv)}
                        disabled={paying[inv.id]}
                        className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-60 mt-2"
                        style={{ backgroundColor: accentColor }}
                      >
                        {paying[inv.id] ? "Redirecting..." : `Pay $${balance.toFixed(2)} Now`}
                      </button>
                    )}

                    {inv.status === "paid" && (
                      <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">
                          Paid {inv.paid_date ? format(new Date(inv.paid_date), "MMM d, yyyy") : ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}