import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, X, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PastDueBanner({ subscription, company }) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!subscription || dismissed) return null;

  const { status, trial_ends_at } = subscription;

  const trialEndsDate = trial_ends_at ? new Date(trial_ends_at) : null;
  const daysUntilTrialEnd = trialEndsDate
    ? Math.ceil((trialEndsDate - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const showTrialWarning = status === "trialing" && daysUntilTrialEnd !== null && daysUntilTrialEnd <= 5 && daysUntilTrialEnd > 0;
  const showPastDue = status === "past_due";

  if (!showTrialWarning && !showPastDue) return null;

  async function openBillingPortal() {
    setLoading(true);
    const res = await base44.functions.invoke("manageSubscription", {
      action: "create_portal",
      company_id: company.id,
      return_url: window.location.href,
    });
    if (res.data?.url) window.location.href = res.data.url;
    setLoading(false);
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${showPastDue ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">
        {showPastDue
          ? "⚠️ Your payment failed. Update your billing info to keep access."
          : `⏳ Your free trial ends in ${daysUntilTrialEnd} day${daysUntilTrialEnd !== 1 ? "s" : ""}. Subscribe to keep your data.`}
      </span>
      <Button
        size="sm"
        onClick={openBillingPortal}
        disabled={loading}
        className="bg-white text-slate-800 hover:bg-slate-100 gap-1.5 h-7 text-xs flex-shrink-0"
      >
        <CreditCard className="w-3.5 h-3.5" />
        {loading ? "Opening..." : showPastDue ? "Fix Payment" : "Subscribe Now"}
      </Button>
      <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}