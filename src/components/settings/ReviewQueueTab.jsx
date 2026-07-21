import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Inbox, ShieldCheck, Unlock, ExternalLink } from "lucide-react";

export default function ReviewQueueTab({ company, isManager }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(company?.review_queue_enabled !== false);
  const [saving, setSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setEnabled(company?.review_queue_enabled !== false);
  }, [company?.id, company?.review_queue_enabled]);

  useEffect(() => {
    if (!company?.id) return;
    base44.entities.MessageQueue.filter({ status: "pending", company_id: company.id })
      .then((items) => setPendingCount(Array.isArray(items) ? items.length : 0))
      .catch(() => setPendingCount(0));
  }, [company?.id]);

  async function handleToggle(val) {
    if (!isManager) return;
    setSaving(true);
    const prev = enabled;
    setEnabled(val);
    try {
      await base44.entities.Company.update(company.id, { review_queue_enabled: val });
      toast({ title: val ? "Review queue enabled" : "Review queue disabled" });
    } catch (e) {
      setEnabled(prev);
      toast({ title: "Failed to update setting", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Inbox className="w-5 h-5 text-slate-500" /> Review Queue
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          When enabled, estimate and invoice sends by non-admin team members are routed to a manager-approval
          queue before going to the customer. Admins and the platform owner always send directly.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${enabled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
              {enabled ? <ShieldCheck className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900">Require manager approval on customer sends</p>
              <p className="text-sm text-slate-500 mt-1">
                {enabled
                  ? "Sends by your team sit in the review queue until a manager approves them."
                  : "Sends go straight to the customer without manager review. Make sure your team is trusted before disabling."}
              </p>
              {pendingCount > 0 && enabled && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                  <Inbox className="w-3.5 h-3.5" />
                  {pendingCount} item{pendingCount === 1 ? "" : "s"} waiting in the review queue.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Switch
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={saving || !isManager}
              />
              <span className="text-sm text-slate-600">{enabled ? "On" : "Off"}</span>
            </div>
          </div>
          {!isManager && (
            <p className="text-xs text-slate-400 mt-3">Only managers and above can change this setting.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Open the Review Queue</CardTitle>
          <CardDescription>Jump to the queue page to approve, edit, or dismiss pending sends.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/MessageQueue">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" /> Go to Review Queue
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}