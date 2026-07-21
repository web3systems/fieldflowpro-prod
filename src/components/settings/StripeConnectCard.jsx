import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Loader2, RefreshCw, Trash2 } from "lucide-react";

export default function StripeConnectCard({ company }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [justReturned, setJustReturned] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (company?.id) checkStatus();
  }, [company?.id]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_return") === "true" || params.get("stripe_refresh") === "true") {
      setJustReturned(true);
      checkStatus();
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Surface a success message when Stripe onboarding completes right after a return
  useEffect(() => {
    if (justReturned && status) {
      if (status.onboarding_complete) {
        setSuccessMessage("✓ Stripe connected successfully! You can now accept online payments.");
      }
      setJustReturned(false);
    }
  }, [justReturned, status]);

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
    setConnecting(false);
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else if (res.data?.error) {
      setConnectError(res.data.error);
    }
  }

  async function openDashboard() {
    const res = await base44.functions.invoke("stripeConnect", {
      action: "get_dashboard_link",
      company_id: company.id
    });
    if (res.data?.url) window.open(res.data.url, "_blank");
  }

  async function disconnectStripe() {
    if (!confirm("Disconnect Stripe? Customers will not be able to pay invoices online until you reconnect.")) return;
    setDisconnecting(true);
    setSuccessMessage(null);
    try {
      await base44.functions.invoke("stripeConnect", { action: "disconnect", company_id: company.id });
      await checkStatus();
    } catch (e) {
      setConnectError(e.message || "Failed to disconnect Stripe");
    } finally {
      setDisconnecting(false);
    }
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
          needsMoreInfo ? "bg-amber-50 border-amber-200" :
          "bg-yellow-50 border-2 border-yellow-300"
        }`}>
          {isComplete ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${needsMoreInfo ? "text-amber-500" : "text-yellow-600"}`} />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${isComplete ? "text-green-800" : needsMoreInfo ? "text-amber-800" : "text-yellow-800"}`}>
              {isComplete ? "Stripe account connected" :
               needsMoreInfo ? "Onboarding incomplete" :
               "⚠️ Stripe is not connected. Customers cannot pay invoices online."}
            </p>
            <p className={`text-xs mt-0.5 ${isComplete ? "text-green-600" : needsMoreInfo ? "text-amber-600" : "text-yellow-700"}`}>
              {isComplete
                ? `Payments for ${company.name} go directly to your Stripe account.`
                : needsMoreInfo
                ? "Your account was created but Stripe needs more information before you can accept payments."
                : "Connect a Stripe account to allow customers to pay invoices by card."}
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

        {/* Success message */}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-700 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!isComplete && (
            <Button onClick={connectStripe} disabled={connecting} className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {connecting ? "Redirecting..." : needsMoreInfo ? "Complete Onboarding" : "Connect Stripe"}
            </Button>
          )}
          {isComplete && (
            <>
              <div className="flex items-center gap-1.5 mr-auto px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Connected
              </div>
              <Button onClick={openDashboard} variant="outline" className="gap-2">
                <ExternalLink className="w-4 h-4" /> Dashboard
              </Button>
              <Button onClick={disconnectStripe} disabled={disconnecting} variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </>
          )}
          <Button onClick={checkStatus} variant="ghost" size="icon" title="Refresh status">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {connectError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-700">Could not connect Stripe</p>
            <p className="text-xs text-red-600 mt-0.5">{connectError}</p>
            {connectError.includes("signed up for Connect") && (
              <a href="https://dashboard.stripe.com/connect" target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline mt-1 inline-block">
                Enable Stripe Connect →
              </a>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400">
          Each company has its own Stripe account. Customer payments go directly to that account.
        </p>
      </CardContent>
    </Card>
  );
}