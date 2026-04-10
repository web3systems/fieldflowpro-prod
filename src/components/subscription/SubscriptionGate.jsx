import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Lock, RefreshCw } from "lucide-react";
import { PLANS } from "@/lib/subscription";

export default function SubscriptionGate({ company, user, children }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!company?.id) { setLoading(false); return; }
    base44.asServiceRole
      ? base44.entities.Subscription.filter({ company_id: company.id })
          .then(subs => { setSubscription(subs[0] || null); setLoading(false); })
          .catch(() => setLoading(false))
      : base44.entities.Subscription.filter({ company_id: company.id })
          .then(subs => { setSubscription(subs[0] || null); setLoading(false); })
          .catch(() => setLoading(false));
  }, [company?.id]);

  // Super admins always get through
  if (user?.role === "admin" || user?.role === "super_admin") return children;

  if (loading) return children; // don't block while loading

  // No subscription at all → treat as trial, let through (new signups)
  if (!subscription) return children;

  const { status, trial_ends_at, current_period_end, stripe_customer_id, plan } = subscription;

  // Trial expired
  const trialExpired = status === "trialing" && trial_ends_at && new Date(trial_ends_at) < new Date();
  // Past due
  const isPastDue = status === "past_due";
  // Cancelled
  const isCancelled = status === "cancelled";
  // Paused
  const isPaused = status === "paused";

  const isBlocked = trialExpired || isPastDue || isCancelled || isPaused;
  if (!isBlocked) return children;

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke("manageSubscription", {
        action: "create_portal",
        company_id: company.id,
        return_url: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) { console.error(e); }
    setPortalLoading(false);
  }

  if (isCancelled || isPaused) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Subscription Cancelled</h2>
          <p className="text-slate-500 mb-2">Your subscription for <strong>{company.name}</strong> has been cancelled.</p>
          {current_period_end && new Date(current_period_end) > new Date() && (
            <p className="text-sm text-slate-400 mb-6">Access expires on {new Date(current_period_end).toLocaleDateString()}.</p>
          )}
          <div className="space-y-3">
            {stripe_customer_id && (
              <Button onClick={openBillingPortal} disabled={portalLoading} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                <CreditCard className="w-4 h-4" />
                {portalLoading ? "Opening..." : "Reactivate Subscription"}
              </Button>
            )}
            <a href="/Register">
              <Button variant="outline" className="w-full">Start a New Plan →</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Failed</h2>
          <p className="text-slate-500 mb-6">We couldn't process your payment. Please update your billing information to continue using FieldFlow Pro.</p>
          <div className="space-y-3">
            <Button onClick={openBillingPortal} disabled={portalLoading} className="w-full bg-amber-500 hover:bg-amber-600 gap-2 text-white">
              <CreditCard className="w-4 h-4" />
              {portalLoading ? "Opening..." : "Update Payment Method"}
            </Button>
            <button onClick={() => window.location.reload()} className="w-full text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 py-2">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh after updating
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Trial expired
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Your Free Trial Has Ended</h2>
        <p className="text-slate-500 mb-6">
          Your 14-day trial for <strong>{company.name}</strong> has expired. Choose a plan to continue.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {["starter", "professional", "enterprise"].map(planKey => {
            const p = PLANS[planKey];
            return (
              <div key={planKey} className={`p-3 rounded-xl border-2 text-left ${planKey === "professional" ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}>
                <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                <p className="text-blue-600 font-semibold">${p.price}<span className="text-xs text-slate-400">/mo</span></p>
              </div>
            );
          })}
        </div>
        <div className="space-y-3">
          {stripe_customer_id && (
            <Button onClick={openBillingPortal} disabled={portalLoading} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              <CreditCard className="w-4 h-4" />
              {portalLoading ? "Opening..." : "Choose a Plan & Subscribe"}
            </Button>
          )}
          {!stripe_customer_id && (
            <a href="/Register">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Subscribe Now →</Button>
            </a>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-4">Questions? Email us at support@fieldflowpro.com</p>
      </div>
    </div>
  );
}