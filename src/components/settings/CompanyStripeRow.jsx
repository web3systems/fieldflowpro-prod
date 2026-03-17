import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";

export default function CompanyStripeRow({ company }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStatus();
  }, [company.id]);

  async function checkStatus() {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke("stripeConnect", {
      action: "check_status",
      company_id: company.id,
    });
    setStatus(res.data);
    setLoading(false);
  }

  async function connectStripe() {
    setConnecting(true);
    setError(null);
    const returnUrl = `${window.location.origin}/SuperAdminDashboard?stripe_return=true`;
    const res = await base44.functions.invoke("stripeConnect", {
      action: status?.connected ? "get_onboarding_link" : "create_account",
      company_id: company.id,
      return_url: returnUrl,
      refresh_url: `${window.location.origin}/SuperAdminDashboard?stripe_refresh=true`,
    });
    setConnecting(false);
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setError(res.data?.error || "Failed to connect");
    }
  }

  async function openDashboard() {
    const res = await base44.functions.invoke("stripeConnect", {
      action: "get_dashboard_link",
      company_id: company.id,
    });
    if (res.data?.url) window.open(res.data.url, "_blank");
  }

  const isComplete = status?.onboarding_complete;
  const isConnected = status?.connected;
  const needsMoreInfo = isConnected && !isComplete;

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-50 last:border-0">
      {/* Company */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: company.primary_color || "#3b82f6" }}
      >
        {company.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{company.name}</p>
        {isConnected && (
          <p className="text-xs text-slate-400 font-mono truncate">{status.account_id}</p>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
        ) : isComplete ? (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle className="w-3 h-3" /> Connected
          </Badge>
        ) : needsMoreInfo ? (
          <Badge className="bg-amber-100 text-amber-700 gap-1">
            <AlertCircle className="w-3 h-3" /> Incomplete
          </Badge>
        ) : (
          <Badge variant="outline" className="text-slate-400">Not connected</Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {!loading && !isComplete && (
          <Button
            size="sm"
            onClick={connectStripe}
            disabled={connecting}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-xs h-8"
          >
            {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
            {connecting ? "..." : needsMoreInfo ? "Resume" : "Connect"}
          </Button>
        )}
        {!loading && isComplete && (
          <Button size="sm" variant="outline" onClick={openDashboard} className="gap-1.5 text-xs h-8">
            <ExternalLink className="w-3 h-3" /> Dashboard
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={checkStatus} title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-500 truncate max-w-xs">{error}</p>
      )}
    </div>
  );
}