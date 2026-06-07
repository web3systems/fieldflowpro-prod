import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * UpgradeNudge — inline upsell prompt for feature-gated sections.
 * 
 * Usage:
 *   <UpgradeNudge
 *     feature="Accounting Module"
 *     description="Track income, expenses, and profit with a full chart of accounts."
 *     requiredPlan="Professional"
 *     company={activeCompany}
 *   />
 */
export default function UpgradeNudge({ feature, description, requiredPlan = "Professional", company, compact = false }) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleUpgrade() {
    if (!company?.id) return;
    setLoading(true);
    try {
      const planKey = requiredPlan.toLowerCase();
      const res = await base44.functions.invoke("createSubscriptionCheckout", {
        company_id: company.id,
        company_name: company.name,
        plan: planKey,
        success_url: `${window.location.origin}${window.location.pathname}?upgraded=true`,
        cancel_url: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg text-sm">
        <Zap className="w-4 h-4 text-violet-600 flex-shrink-0" />
        <span className="text-violet-700 flex-1"><strong>{feature}</strong> requires {requiredPlan}.</span>
        <Button size="sm" onClick={handleUpgrade} disabled={loading} className="bg-violet-600 hover:bg-violet-700 h-7 text-xs gap-1">
          {loading ? "..." : <><ArrowRight className="w-3 h-3" /> Upgrade</>}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-16 px-8 text-center bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-2xl">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 text-slate-300 hover:text-slate-500"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
        <Zap className="w-7 h-7 text-violet-600" />
      </div>

      <div className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
        {requiredPlan} Feature
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">{feature}</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">{description}</p>

      <Button
        onClick={handleUpgrade}
        disabled={loading}
        className="bg-violet-600 hover:bg-violet-700 gap-2 px-6"
      >
        <Zap className="w-4 h-4" />
        {loading ? "Opening..." : `Upgrade to ${requiredPlan}`}
        <ArrowRight className="w-4 h-4" />
      </Button>

      <p className="text-xs text-slate-400 mt-3">No long-term commitment · Cancel anytime</p>
    </div>
  );
}