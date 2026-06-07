import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, X, CreditCard, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PastDueBanner({ subscription, company }) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!subscription || dismissed) return null;

  const { status, trial_ends_at, plan } = subscription;

  const trialEndsDate = trial_ends_at ? new Date(trial_ends_at) : null;
  const daysUntilTrialEnd = trialEndsDate
    ? Math.ceil((trialEndsDate - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  // Show trial banner throughout the trial, with increasing urgency
  const isTrialing = status === "trialing" && plan === "trial";
  const showTrialBanner = isTrialing && daysUntilTrialEnd !== null && daysUntilTrialEnd > 0;
  const showPastDue = status === "past_due";

  if (!showTrialBanner && !showPastDue) return null;

  // Urgency levels
  const isUrgent = showTrialBanner && daysUntilTrialEnd <= 3;
  const isWarning = showTrialBanner && daysUntilTrialEnd <= 7 && daysUntilTrialEnd > 3;
  const isInfo = showTrialBanner && daysUntilTrialEnd > 7;

  let bgColor = "bg-blue-600";
  if (showPastDue) bgColor = "bg-red-600";
  else if (isUrgent) bgColor = "bg-red-500";
  else if (isWarning) bgColor = "bg-amber-500";

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

  const trialMessage = () => {
    if (daysUntilTrialEnd > 7) return `🚀 You're on a free trial — ${daysUntilTrialEnd} days remaining. Subscribe anytime to keep full access.`;
    if (daysUntilTrialEnd > 3) return `⏳ ${daysUntilTrialEnd} days left in your trial. Subscribe now to avoid any interruption.`;
    if (daysUntilTrialEnd === 1) return `🔴 Last day of your trial! Subscribe now to keep your data and stay active.`;
    return `🔴 ${daysUntilTrialEnd} days left in your trial — subscribe now to keep access to your jobs, customers, and invoices.`;
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${bgColor} text-white`}>
      {isUrgent || showPastDue ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : isWarning ? <Clock className="w-4 h-4 flex-shrink-0" /> : <Zap className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1">
        {showPastDue
          ? "⚠️ Your payment failed. Update your billing info to keep access."
          : trialMessage()}
      </span>
      <Button
        size="sm"
        onClick={openBillingPortal}
        disabled={loading}
        className="bg-white text-slate-800 hover:bg-slate-100 gap-1.5 h-7 text-xs flex-shrink-0 font-semibold"
      >
        <CreditCard className="w-3.5 h-3.5" />
        {loading ? "Opening..." : showPastDue ? "Fix Payment" : "Subscribe Now"}
      </Button>
      {isInfo && (
        <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}