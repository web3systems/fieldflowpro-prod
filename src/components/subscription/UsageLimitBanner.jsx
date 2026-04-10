import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/subscription";

/**
 * Shows an upgrade prompt when the company is approaching or at a plan limit.
 * Props:
 *   subscription: the Subscription record
 *   metric: "jobs_per_month" | "users"
 *   currentCount: number
 */
export default function UsageLimitBanner({ subscription, metric, currentCount }) {
  if (!subscription) return null;

  const plan = subscription.plan || "trial";
  const status = subscription.status;
  if (!["trialing", "active"].includes(status)) return null;

  const planConfig = PLANS[plan];
  const limit = planConfig?.limits?.[metric];
  if (!limit) return null; // unlimited

  const pct = currentCount / limit;
  if (pct < 0.8) return null; // only show at 80%+ usage

  const atLimit = currentCount >= limit;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl mb-4 ${
      atLimit ? "bg-red-50 border border-red-200 text-red-700" : "bg-amber-50 border border-amber-200 text-amber-700"
    }`}>
      <Zap className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">
        {atLimit
          ? `You've reached your ${plan} plan limit of ${limit} ${metric.replace("_", " ")}. Upgrade to continue.`
          : `You're using ${currentCount} of ${limit} ${metric.replace("_", " ")} on your ${plan} plan.`}
      </span>
      <Link to="/CompanySettings?tab=billing">
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs gap-1">
          <Zap className="w-3 h-3" /> Upgrade
        </Button>
      </Link>
    </div>
  );
}