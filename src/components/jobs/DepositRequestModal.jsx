import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { DollarSign, CreditCard, Banknote, Percent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function DepositRequestModal({ job, jobTotal, onClose, onDeposited }) {
  const [mode, setMode] = useState("percent"); // "percent" | "fixed"
  const [percentValue, setPercentValue] = useState(25);
  const [fixedValue, setFixedValue] = useState("");
  const [method, setMethod] = useState("stripe"); // "stripe" | "manual"
  const [manualMethod, setManualMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const depositAmount = mode === "percent"
    ? parseFloat(((percentValue / 100) * jobTotal).toFixed(2))
    : parseFloat(fixedValue) || 0;

  async function handleStripeDeposit() {
    if (depositAmount <= 0) { setError("Please enter a valid deposit amount."); return; }
    const isInIframe = window.self !== window.top;
    if (isInIframe) { alert("Payment checkout only works from the published app."); return; }
    setLoading(true);
    setError("");
    const res = await base44.functions.invoke("createDepositCheckout", {
      job_id: job.id,
      deposit_amount: depositAmount,
      deposit_label: `${mode === "percent" ? percentValue + "% " : ""}Deposit – ${job.title}`,
      success_url: window.location.origin + createPageUrl("Payments"),
      cancel_url: window.location.href,
    });
    setLoading(false);
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setError(res.data?.error || "Failed to create checkout session.");
    }
  }

  async function handleManualDeposit() {
    if (depositAmount <= 0) { setError("Please enter a valid deposit amount."); return; }
    setLoading(true);
    setError("");

    // Create a deposit invoice marked as paid
    const allInv = await base44.entities.Invoice.list();
    const invoice_number = `DEP-${String((allInv.length || 0) + 1).padStart(4, "0")}`;
    const invoice = await base44.entities.Invoice.create({
      company_id: job.company_id,
      customer_id: job.customer_id,
      job_id: job.id,
      estimate_id: job.estimate_id || "",
      invoice_number,
      status: "paid",
      line_items: [{ description: `Deposit – ${job.title}`, quantity: 1, unit_price: depositAmount, total: depositAmount }],
      subtotal: depositAmount,
      tax_rate: 0,
      tax_amount: 0,
      total: depositAmount,
      amount_paid: depositAmount,
      paid_date: new Date().toISOString().split("T")[0],
      payment_method: manualMethod,
      notes: "Deposit payment",
    });

    setLoading(false);
    if (onDeposited) onDeposited(invoice);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Request Deposit</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Job total reference */}
          <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
            <span className="text-sm text-slate-500">Job Total</span>
            <span className="font-bold text-slate-800">${(jobTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {/* Amount type toggle */}
          <div>
            <Label className="text-xs text-slate-500 mb-2 block">Deposit Amount</Label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMode("percent")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${mode === "percent" ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
              >
                <Percent className="w-3.5 h-3.5" /> Percentage
              </button>
              <button
                onClick={() => setMode("fixed")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${mode === "fixed" ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Fixed Amount
              </button>
            </div>

            {mode === "percent" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {[10, 25, 50].map(p => (
                    <button
                      key={p}
                      onClick={() => setPercentValue(p)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${percentValue === p ? "bg-blue-50 border-blue-400 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={percentValue}
                    onChange={e => setPercentValue(Math.min(100, Math.max(1, parseFloat(e.target.value) || 0)))}
                    className="w-24 text-sm"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">$</span>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={fixedValue}
                  onChange={e => setFixedValue(e.target.value)}
                  placeholder="0.00"
                  className="w-36 text-sm"
                />
              </div>
            )}
          </div>

          {/* Calculated deposit */}
          {depositAmount > 0 && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-green-700">Deposit Amount</span>
              <span className="text-lg font-bold text-green-700">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          {/* Collection method */}
          <div>
            <Label className="text-xs text-slate-500 mb-2 block">Collection Method</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setMethod("stripe")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex-1 justify-center ${method === "stripe" ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Online (Stripe)
              </button>
              <button
                onClick={() => setMethod("manual")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex-1 justify-center ${method === "manual" ? "bg-slate-700 text-white border-slate-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
              >
                <Banknote className="w-3.5 h-3.5" /> Record Manual
              </button>
            </div>
          </div>

          {/* Manual method picker */}
          {method === "manual" && (
            <div>
              <Label className="text-xs text-slate-500 mb-2 block">Payment Method</Label>
              <div className="flex flex-wrap gap-2">
                {["cash", "check", "zelle", "venmo", "other"].map(m => (
                  <button
                    key={m}
                    onClick={() => setManualMethod(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${manualMethod === m ? "bg-slate-700 text-white border-slate-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            {method === "stripe" ? (
              <Button
                onClick={handleStripeDeposit}
                disabled={loading || depositAmount <= 0}
                className="flex-1 gap-1.5 bg-violet-600 hover:bg-violet-700"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {loading ? "Loading..." : `Send Stripe Link`}
              </Button>
            ) : (
              <Button
                onClick={handleManualDeposit}
                disabled={loading || depositAmount <= 0}
                className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
              >
                <Banknote className="w-3.5 h-3.5" />
                {loading ? "Saving..." : "Record Deposit"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}