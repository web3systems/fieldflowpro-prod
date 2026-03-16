import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";

export default function StripeConnectCard({ company }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (company?.id) checkStatus();
  }, [company?.id]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_return") === "true" || params.get("stripe_refresh") === "true") {
      checkStatus();
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function checkStatus() {
    setLoading(true);
    const res = await base44.functions.invoke("stripeConnect", {
      action: "check_status",
      company_id: company.id
    });
    setStatus(res.data);
    setLoading(false);
  }

  async function connectStripe() {
    setConnecting(true);
    const returnUrl = `${window.location.origin}/Settings?stripe_return=true`;
    const res = await base44.functions.invoke("stripeConnect", {
      action: status?.connected ? "get_onboarding_link" : "create_account",
      company_id: company.id,
      return_url: returnUrl,
      refresh_url: `${window.location.origin}/Settings?stripe_refresh=true`
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    }
    setConnecting(false);
  }

  async function openDashboard() {
    const res = await base44.functions.invoke("stripeConnect", {
      action: "get_dashboard_link",
      company_id: company.id
    });
    if (res.data?.url) window.open(res.data.url, "_blank");
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  const isComplete = status?.onboarding_complete;
  const isConnected = status?.connected;
  const needsMoreInfo = isConnected && !isComplete;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> Stripe Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Banner */}
        <div className={`p-4 rounded-xl flex items-start gap-3 ${
          isComplete ? "bg-green-50 border border-green-200" :
          needsMoreInfo ? "bg-amber-50 border border-amber-200" :
          "bg-slate-50 border border-slate-200"
        }`}>
          {isComplete ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${needsMoreInfo ? "text-amber-500" : "text-slate-400"}`} />
          )}
          <div>
            <p className={`text-sm font-medium ${isComplete ? "text-green-800" : needsMoreInfo ? "text-amber-800" : "text-slate-700"}`}>
              {isComplete ? "Stripe account connected" :
               needsMoreInfo ? "Onboarding incomplete" :
               "No Stripe account connected"}
            </p>
            <p className={`text-xs mt-0.5 ${isComplete ? "text-green-600" : needsMoreInfo ? "text-amber-600" : "text-slate-500"}`}>
              {isComplete
                ? `Payments for ${company.name} go directly to your Stripe account.`
                : needsMoreInfo
                ? "Your account was created but Stripe needs more information before you can accept payments."
                : "Connect a Stripe account to accept card payments from customers."}
            </p>
            {isConnected && (
              <p className="text-xs text-slate-400 mt-1 font-mono">{status.account_id}</p>
            )}
          </div>
        </div>

        {/* Status pills */}
        {isConnected && (
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className={status.details_submitted ? "text-green-700 border-green-200 bg-green-50" : "text-slate-500"}>
              {status.details_submitted ? "✓" : "○"} Details submitted
            </Badge>
            <Badge variant="outline" className={status.charges_enabled ? "text-green-700 border-green-200 bg-green-50" : "text-slate-500"}>
              {status.charges_enabled ? "✓" : "○"} Charges enabled
            </Badge>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!isComplete && (
            <Button onClick={connectStripe} disabled={connecting} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {connecting ? "Redirecting..." : needsMoreInfo ? "Complete Onboarding" : "Connect Stripe Account"}
            </Button>
          )}
          {isComplete && (
            <Button onClick={openDashboard} variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" /> Open Stripe Dashboard
            </Button>
          )}
          <Button onClick={checkStatus} variant="ghost" size="icon" title="Refresh status">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-slate-400">
          Each company has its own Stripe account. Customer payments go directly to that account.
        </p>
      </CardContent>
    </Card>
  );
}