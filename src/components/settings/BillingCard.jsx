import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PLANS, isSubscriptionActive } from "@/lib/subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Loader2, Zap } from "lucide-react";
import { format } from "date-fns";

export default function BillingCard({ company }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(null);

  useEffect(() => {
    if (company?.id) loadSubscription();
  }, [company?.id]);

  async function loadSubscription() {
    setLoading(true);
    const res = await base44.functions.invoke("manageSubscription", {
      action: "get_status",
      company_id: company.id,
    });
    setSubscription(res.data?.subscription || null);
    setLoading(false);
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    const res = await base44.functions.invoke("manageSubscription", {
      action: "create_portal",
      company_id: company.id,
      return_url: window.location.href,
    });
    setPortalLoading(false);
    if (res.data?.url) window.open(res.data.url, "_blank");
  }

  async function upgradePlan(planKey) {
    if (window.self !== window.top) {
      alert("Checkout works only from the published app, not an embedded preview.");
      return;
    }
    setUpgradeLoading(planKey);
    const user = await base44.auth.me();
    const res = await base44.functions.invoke("createSubscriptionCheckout", {
      plan: planKey,
      company_id: company.id,
      owner_email: user.email,
      owner_name: user.full_name,
      success_url: `${window.location.origin}/Settings?subscribed=true`,
      cancel_url: window.location.href,
    });
    setUpgradeLoading(null);
    if (res.data?.url) window.location.href = res.data.url;
  }

  const statusColors = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
    paused: "bg-slate-100 text-slate-600",
  };

  const plan = PLANS[subscription?.plan || "trial"];
  const isActive = isSubscriptionActive(subscription);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current plan */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Billing & Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription ? (
            <>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{plan?.name} Plan</span>
                    <Badge className={statusColors[subscription.status] || "bg-slate-100 text-slate-600"}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {plan?.price > 0 ? `$${plan.price}/month` : "Free"}
                    {subscription.current_period_end && (
                      <span className="ml-2">· Renews {format(new Date(subscription.current_period_end), "MMM d, yyyy")}</span>
                    )}
                  </p>
                  {subscription.trial_ends_at && subscription.status === "trialing" && (
                    <p className="text-xs text-blue-600 mt-1">
                      Trial ends {format(new Date(subscription.trial_ends_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                {isActive && (
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                )}
                {!isActive && (
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>

              {subscription.stripe_customer_id && (
                <Button variant="outline" onClick={openBillingPortal} disabled={portalLoading} className="gap-2">
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Manage Billing & Invoices
                </Button>
              )}
            </>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-amber-700 font-medium text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> No active subscription
              </p>
              <p className="text-amber-600 text-xs mt-1">Choose a plan below to activate your account.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan upgrade options */}
      {(!subscription || !["professional", "enterprise"].includes(subscription.plan)) && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-500" /> Upgrade Your Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["starter", "professional", "enterprise"].map(planKey => {
              const p = PLANS[planKey];
              const isCurrent = subscription?.plan === planKey && isActive;
              return (
                <div key={planKey} className={`flex items-center justify-between p-4 rounded-xl border ${isCurrent ? "bg-blue-50 border-blue-200" : "border-slate-100 bg-slate-50"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{p.name}</span>
                      {p.popular && <Badge className="bg-violet-100 text-violet-700 text-xs">Popular</Badge>}
                      {isCurrent && <Badge className="bg-blue-100 text-blue-700 text-xs">Current</Badge>}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">${p.price}/mo · {p.limits.users ? `${p.limits.users} users` : "Unlimited users"}</p>
                  </div>
                  {!isCurrent && (
                    <Button
                      size="sm"
                      onClick={() => upgradePlan(planKey)}
                      disabled={!!upgradeLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-xs h-8"
                    >
                      {upgradeLoading === planKey ? <Loader2 className="w-3 h-3 animate-spin" /> : "Select"}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}