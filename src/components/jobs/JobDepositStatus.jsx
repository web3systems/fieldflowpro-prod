import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Clock, Copy, DollarSign, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function JobDepositStatus({ job, onDepositUpdated }) {
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);

  const { deposit_status, deposit_amount, deposit_paid_date, deposit_stripe_link } = job || {};

  async function handleMarkPaid() {
    setMarking(true);
    const today = new Date().toISOString().split("T")[0];

    // Add a "Deposit Paid" line item (negative) so the deposit carries over to
    // the invoice generated from this job's line items.
    const latest = await base44.entities.Job.get(job.id).catch(() => job);
    const currentItems = latest.line_items || [];
    const hasDepositLine = currentItems.some(i => i.category === "deposit" || i.description === "Deposit Paid");
    let newItems = currentItems;
    let newTotal = latest.total_amount || 0;
    if (!hasDepositLine && deposit_amount > 0) {
      newItems = [...currentItems, {
        description: "Deposit Paid",
        quantity: 1,
        unit_price: -deposit_amount,
        total: -deposit_amount,
        category: "deposit",
      }];
      newTotal = newItems.reduce((s, i) => s + (i.total || 0), 0);
    }

    await base44.entities.Job.update(job.id, {
      deposit_status: "paid",
      deposit_paid_date: today,
      line_items: newItems,
      total_amount: newTotal,
    });
    setMarking(false);
    if (onDepositUpdated) onDepositUpdated({
      ...job,
      deposit_status: "paid",
      deposit_paid_date: today,
      line_items: newItems,
      total_amount: newTotal,
    });
  }

  function copyLink() {
    if (!deposit_stripe_link) return;
    navigator.clipboard.writeText(deposit_stripe_link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!deposit_status) return null;

  if (deposit_status === "paid") {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Deposit Paid ✓ — {fmt(deposit_amount)}</p>
          {deposit_paid_date && (
            <p className="text-xs text-green-600">Paid on {format(new Date(deposit_paid_date), "MMM d, yyyy")}</p>
          )}
        </div>
      </div>
    );
  }

  if (deposit_status === "waived") {
    return (
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <DollarSign className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <p className="text-sm text-slate-500">Deposit waived</p>
      </div>
    );
  }

  // pending
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">Deposit Pending — {fmt(deposit_amount)}</p>
        </div>
        <div className="flex items-center gap-2">
          {deposit_stripe_link && (
            <Button
              size="sm"
              variant="outline"
              onClick={copyLink}
              className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkPaid}
            disabled={marking}
            className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
          >
            <CheckCircle className="w-3 h-3" />
            {marking ? "Saving..." : "Mark as Paid"}
          </Button>
        </div>
      </div>
      {deposit_stripe_link && (
        <p className="text-xs text-amber-600 truncate">
          Payment link: <a href={deposit_stripe_link} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800">{deposit_stripe_link}</a>
        </p>
      )}
    </div>
  );
}