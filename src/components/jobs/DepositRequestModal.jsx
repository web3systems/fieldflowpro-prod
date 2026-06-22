import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, X, CreditCard, CheckCircle, Copy, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DepositRequestModal({ job, customer, onClose, onDepositRequested }) {
  const jobTotal = job?.total_amount || 0;
  const materialsTotal = (job?.line_items || [])
    .filter(i => i.category === "materials" || i.category === "material")
    .reduce((s, i) => s + (i.total || 0), 0);

  const [option, setOption] = useState("half"); // "half" | "materials" | "custom"
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const depositAmount = (() => {
    if (option === "half") return parseFloat((jobTotal * 0.5).toFixed(2));
    if (option === "materials") return parseFloat(materialsTotal.toFixed(2));
    return parseFloat(customAmount) || 0;
  })();

  const isValid = depositAmount > 0 && depositAmount <= jobTotal;

  async function handleConfirm() {
    if (!isValid) {
      setError(depositAmount <= 0 ? "Enter a valid amount greater than $0." : `Amount cannot exceed job total of $${jobTotal.toFixed(2)}.`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("requestDeposit", {
        job_id: job.id,
        deposit_amount: depositAmount,
        deposit_option: option,
      });
      if (res.data?.success) {
        onDepositRequested({ deposit_amount: depositAmount, deposit_status: "pending", deposit_stripe_link: res.data.payment_link });
        onClose();
      } else {
        setError(res.data?.error || "Failed to create deposit request.");
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const options = [
    {
      key: "half",
      label: "50% of Job Total",
      detail: `50% of ${fmt(jobTotal)} = ${fmt(jobTotal * 0.5)}`,
      available: jobTotal > 0,
    },
    {
      key: "materials",
      label: "Materials Only",
      detail: materialsTotal > 0 ? `Materials total = ${fmt(materialsTotal)}` : "No material line items on this job",
      available: materialsTotal > 0,
    },
    {
      key: "custom",
      label: "Custom Amount",
      detail: "Enter any amount up to the job total",
      available: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Request Deposit</h2>
              <p className="text-xs text-slate-400">Job total: {fmt(jobTotal)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Option selection */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">Select Deposit Amount</Label>
            {options.map(opt => (
              <button
                key={opt.key}
                onClick={() => opt.available && setOption(opt.key)}
                disabled={!opt.available}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                  option === opt.key
                    ? "border-blue-500 bg-blue-50"
                    : opt.available
                    ? "border-slate-200 hover:border-slate-300 bg-white"
                    : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${
                  option === opt.key ? "border-blue-500 bg-blue-500" : "border-slate-300"
                }`}>
                  {option === opt.key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.detail}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          {option === "custom" && (
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Enter Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm font-medium">$</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={jobTotal}
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                  autoFocus
                />
              </div>
              {customAmount && parseFloat(customAmount) > jobTotal && (
                <p className="text-xs text-red-500 mt-1">Cannot exceed job total of {fmt(jobTotal)}</p>
              )}
            </div>
          )}

          {/* Deposit summary */}
          {depositAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-green-700">Deposit Amount</span>
              <span className="text-xl font-bold text-green-700">{fmt(depositAmount)}</span>
            </div>
          )}

          {/* Customer notification preview */}
          {customer && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer Notification</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">To:</span>
                <span className="text-xs font-medium text-slate-700">
                  {customer.first_name || customer.business_name || "Customer"}
                  {customer.email ? ` · ${customer.email}` : ""}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                </span>
              </div>
              {!customer.email && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> No email on file — deposit link will be created but not emailed.
                </p>
              )}
              {depositAmount > 0 && (
                <p className="text-xs text-slate-600 italic bg-white rounded-lg p-2.5 border border-slate-200">
                  "Hi {customer.first_name || customer.business_name || "there"}, your deposit of {fmt(depositAmount)} is ready.
                  Click here to pay: [payment link]"
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2.5">{error}</p>}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !isValid}
              className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              <CreditCard className="w-4 h-4" />
              {loading ? "Sending..." : "Send Deposit Request"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}