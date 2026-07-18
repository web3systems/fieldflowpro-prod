import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import {
  Mail, FileText, DollarSign, Clock, CheckCircle, XCircle,
  ExternalLink, Send, Inbox, RefreshCw, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function MessageQueue() {
  const { user } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pending = await base44.entities.MessageQueue.filter({ status: "pending" }, "-requested_at");
      setItems(pending);
    } catch (e) {
      console.error("queue load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSend(item) {
    setActioningId(item.id);
    try {
      if (item.doc_type === "estimate") {
        await base44.functions.invoke("sendEstimateOrInvoice", {
          estimate_id: item.doc_id,
          customer_id: item.customer_id,
          company_id: item.company_id,
          contact_method: "email",
        });
      } else {
        const portalUrl = window.location.origin + "/CustomerPortal";
        await base44.functions.invoke("sendInvoiceEmail", {
          invoice_id: item.doc_id,
          portal_url: portalUrl,
        });
      }
      await base44.entities.MessageQueue.update(item.id, { status: "sent", sent_at: new Date().toISOString() });
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || "Failed to send");
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject(item) {
    if (!confirm("Remove this item from the review queue? The customer will not receive it.")) return;
    setActioningId(item.id);
    try {
      await base44.entities.MessageQueue.update(item.id, { status: "rejected" });
      setItems(prev => prev.filter(i => i.id !== item.id));
    } finally {
      setActioningId(null);
    }
  }

  if (user && user.role !== "super_admin" && user.role !== "admin") {
    return (
      <div className="p-6 text-center text-slate-500 pt-20">
        <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-slate-300" />
        <p>You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-slate-500" /> Review Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Estimate & invoice sends queued by your team. Review, edit the document if needed, then send to the customer.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading queue…</div>
      ) : items.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
            <p className="font-medium text-slate-600">Queue is empty</p>
            <p className="text-sm">No estimate or invoice sends are waiting for review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const isEstimate = item.doc_type === "estimate";
            const Icon = isEstimate ? FileText : DollarSign;
            return (
              <Card key={item.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${isEstimate ? "bg-gradient-to-br from-purple-400 to-purple-600" : "bg-gradient-to-br from-emerald-400 to-emerald-600"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 truncate">{item.doc_title || "Untitled"}</span>
                        {item.doc_number && <Badge variant="outline" className="font-mono text-xs">{item.doc_number}</Badge>}
                        <Badge className="bg-amber-100 text-amber-700 text-xs capitalize">{item.doc_type}</Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.to_email || "—"}</span>
                        <span>To: <span className="text-slate-700 font-medium">{item.customer_name || "—"}</span></span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.requested_at ? new Date(item.requested_at).toLocaleString() : ""}</span>
                        {item.requested_by_name && <span>By: {item.requested_by_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 justify-end">
                    <Link to={isEstimate ? `/EstimateDetail/${item.doc_id}` : `/InvoiceDetail/${item.doc_id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" /> Open & Edit
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => handleReject(item)} disabled={actioningId === item.id} className="gap-1.5 border-slate-200 text-slate-500 hover:bg-slate-50">
                      <XCircle className="w-3.5 h-3.5" /> Dismiss
                    </Button>
                    <Button size="sm" onClick={() => handleSend(item)} disabled={actioningId === item.id} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                      <Send className="w-3.5 h-3.5" /> {actioningId === item.id ? "Sending…" : "Send to Customer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}