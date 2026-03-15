import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Plus, Mail, Phone, Send, Pencil, Trash2, Clock, CheckCircle2, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import CampaignForm from "@/components/marketing/CampaignForm";
import CampaignStats from "@/components/marketing/CampaignStats";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const AUDIENCE_LABELS = {
  all_customers: "All Customers",
  active_customers: "Active Customers",
  inactive_customers: "Inactive Customers",
  leads: "Leads",
};

export default function Marketing() {
  const { activeCompany } = useApp();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (activeCompany) load();
  }, [activeCompany]);

  async function load() {
    setLoading(true);
    const data = await base44.entities.MarketingCampaign.filter({ company_id: activeCompany.id }, "-created_date");
    setCampaigns(data);
    setLoading(false);
  }

  async function handleSave(form) {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id };
    if (editing?.id) {
      await base44.entities.MarketingCampaign.update(editing.id, data);
    } else {
      await base44.entities.MarketingCampaign.create(data);
    }
    setSaving(false);
    setSheetOpen(false);
    setEditing(null);
    await load();
    toast({ title: editing?.id ? "Campaign updated" : "Campaign created" });
  }

  async function handleSend(campaign) {
    setSending(campaign.id);
    try {
      const res = await base44.functions.invoke("sendMarketingCampaign", { campaign_id: campaign.id });
      toast({ title: `Campaign sent to ${res.data.sent_count} recipients!` });
      await load();
    } catch (e) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    }
    setSending(null);
  }

  async function handleDelete() {
    await base44.entities.MarketingCampaign.delete(deleteTarget.id);
    setDeleteTarget(null);
    await load();
    toast({ title: "Campaign deleted" });
  }

  const filtered = tab === "all" ? campaigns : campaigns.filter(c => c.status === tab);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create and send email & SMS campaigns to your customers</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setSheetOpen(true); }}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <CampaignStats campaigns={campaigns} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {["all", "draft", "sent", "scheduled", "cancelled"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
            <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
              {(t === "all" ? campaigns : campaigns.filter(c => c.status === t)).length}
            </span>
          </button>
        ))}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading campaigns...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No campaigns yet</p>
            <p className="text-slate-400 text-sm mt-1">Create your first campaign to start reaching customers</p>
            <Button onClick={() => { setEditing(null); setSheetOpen(true); }} className="mt-4 bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" /> New Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(campaign => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${campaign.type === "email" ? "bg-blue-50" : "bg-purple-50"}`}>
                      {campaign.type === "email"
                        ? <Mail className="w-5 h-5 text-blue-600" />
                        : <Phone className="w-5 h-5 text-purple-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{campaign.name}</p>
                        <Badge className={STATUS_STYLES[campaign.status]}>{campaign.status}</Badge>
                        <Badge variant="outline" className="text-xs">{AUDIENCE_LABELS[campaign.audience]}</Badge>
                      </div>
                      {campaign.subject && <p className="text-sm text-slate-500 mt-0.5 truncate">{campaign.subject}</p>}
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{campaign.message}</p>
                      <div className="flex items-center gap-4 mt-2">
                        {campaign.status === "sent" && (
                          <>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Send className="w-3 h-3" /> {campaign.sent_count || 0} sent
                            </span>
                            {campaign.open_count > 0 && (
                              <span className="text-xs text-slate-500">{campaign.open_count} opens</span>
                            )}
                            {campaign.sent_at && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {format(new Date(campaign.sent_at), "MMM d, yyyy")}
                              </span>
                            )}
                          </>
                        )}
                        {campaign.status === "draft" && (
                          <span className="text-xs text-slate-400">Created {format(new Date(campaign.created_date), "MMM d, yyyy")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {campaign.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditing(campaign); setSheetOpen(true); }}
                          className="gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSend(campaign)}
                          disabled={sending === campaign.id}
                          className="gap-1.5 bg-green-600 hover:bg-green-700"
                        >
                          {sending === campaign.id ? (
                            <span className="flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending...</span>
                          ) : (
                            <><Send className="w-3.5 h-3.5" /> Send Now</>
                          )}
                        </Button>
                      </>
                    )}
                    {campaign.status === "sent" && (
                      <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Sent
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(campaign)}
                      className="text-slate-400 hover:text-red-500 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.id ? "Edit Campaign" : "New Campaign"}</SheetTitle>
            <SheetDescription>
              {editing?.id ? "Update campaign details." : "Create an email or SMS campaign to send to your audience."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <CampaignForm
              campaign={editing}
              onSave={handleSave}
              onCancel={() => { setSheetOpen(false); setEditing(null); }}
              saving={saving}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}