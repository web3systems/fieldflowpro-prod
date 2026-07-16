import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Webhook, Link2, KeyRound, Plus, Copy, RefreshCw, Trash2,
  ArrowDownToLine, ArrowUpFromLine, Send, CheckCircle2
} from "lucide-react";

const PROVIDERS = [
  { value: "thumbtack", label: "Thumbtack" },
  { value: "angies_list", label: "Angi / Angie's List" },
  { value: "homeadvisor", label: "HomeAdvisor" },
  { value: "zapier", label: "Zapier" },
  { value: "make", label: "Make / Integromat" },
  { value: "custom", label: "Custom / Other" },
];

const OUTBOUND_EVENTS = [
  "lead.created", "customer.created", "job.created", "job.updated", "job.completed",
  "estimate.created", "estimate.approved", "invoice.created", "invoice.paid", "payment.received"
];

function randomToken() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export default function ApiWebhooksTab({ company }) {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");

  // New outbound API form
  const [apiForm, setApiForm] = useState({ name: "", provider: "thumbtack", api_key: "" });
  // New outbound webhook form
  const [hookForm, setHookForm] = useState({ name: "", webhook_url: "", events: [] });

  useEffect(() => { if (company?.id) load(); }, [company?.id]);

  async function load() {
    setLoading(true);
    try {
      const list = await base44.entities.Integration.filter({ company_id: company.id });
      list.sort((a, b) => (a.created_date || "").localeCompare(b.created_date || ""));
      setIntegrations(list);
    } catch (e) {
      toast({ title: "Failed to load integrations", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const incoming = integrations.find(i => i.integration_type === "incoming_webhook");
  const outboundApis = integrations.filter(i => i.integration_type === "outbound_api");
  const outboundHooks = integrations.filter(i => i.integration_type === "outbound_webhook");

  function buildIngestUrl(secret) {
    return `${window.location.origin}/api/functions/integrationIngest?company=${company.id}&token=${secret}`;
  }

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  async function generateIncoming() {
    setSaving(true);
    try {
      if (incoming) {
        await base44.entities.Integration.delete(incoming.id);
      }
      const created = await base44.entities.Integration.create({
        company_id: company.id,
        name: "Incoming Webhook",
        provider: "custom",
        integration_type: "incoming_webhook",
        secret: randomToken(),
        is_active: true
      });
      toast({ title: "Incoming webhook URL generated", description: "Use this URL in your external system." });
      await load();
    } catch (e) {
      toast({ title: "Failed to generate webhook", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function rotateSecret() {
    if (!incoming) return;
    setSaving(true);
    try {
      await base44.entities.Integration.update(incoming.id, { secret: randomToken() });
      toast({ title: "Secret rotated", description: "Update the URL in your external system." });
      await load();
    } catch (e) {
      toast({ title: "Failed to rotate secret", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(int, value) {
    try {
      await base44.entities.Integration.update(int.id, { is_active: value });
      await load();
    } catch (e) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  }

  async function removeIntegration(id) {
    try {
      await base44.entities.Integration.delete(id);
      await load();
      toast({ title: "Integration removed" });
    } catch (e) {
      toast({ title: "Failed to remove", description: e.message, variant: "destructive" });
    }
  }

  async function addOutboundApi() {
    if (!apiForm.name.trim() || !apiForm.api_key.trim()) {
      toast({ title: "Name and API key are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Integration.create({
        company_id: company.id,
        name: apiForm.name.trim(),
        provider: apiForm.provider,
        integration_type: "outbound_api",
        api_key: apiForm.api_key.trim(),
        webhook_url: apiForm.webhook_url || "",
        is_active: true
      });
      setApiForm({ name: "", provider: "thumbtack", api_key: "", webhook_url: "" });
      toast({ title: "API connection saved" });
      await load();
    } catch (e) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function addOutboundWebhook() {
    if (!hookForm.name.trim() || !hookForm.webhook_url.trim()) {
      toast({ title: "Name and URL are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Integration.create({
        company_id: company.id,
        name: hookForm.name.trim(),
        provider: "custom",
        integration_type: "outbound_webhook",
        webhook_url: hookForm.webhook_url.trim(),
        events: hookForm.events,
        is_active: true
      });
      setHookForm({ name: "", webhook_url: "", events: [] });
      toast({ title: "Webhook subscription saved" });
      await load();
    } catch (e) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function toggleEvent(ev) {
    setHookForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev]
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
          <Webhook className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">API & Webhooks</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Connect FieldFlow to external systems (Thumbtack, Angi, Zapier, etc.) to pull in leads or send events out.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          {/* 1. Incoming Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                Incoming Webhook
              </CardTitle>
              <CardDescription>
                A unique URL external systems POST leads to. New submissions auto-create leads in this company.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!incoming ? (
                <Button onClick={generateIncoming} disabled={saving}>
                  <Plus className="w-4 h-4" /> Generate Webhook URL
                </Button>
              ) : (
                <>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-500">Webhook URL</span>
                      <Badge className={incoming.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>
                        {incoming.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-slate-700 break-all flex-1 font-mono">
                        {buildIngestUrl(incoming.secret)}
                      </code>
                      <Button size="sm" variant="outline" onClick={() => copy(buildIngestUrl(incoming.secret), "url")}>
                        {copied === "url" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <span className="text-xs font-medium text-slate-500">Secret token</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-slate-600 font-mono truncate flex-1">{incoming.secret}</code>
                        <Button size="sm" variant="outline" onClick={() => copy(incoming.secret, "tok")}>
                          {copied === "tok" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={rotateSecret} disabled={saving}>
                          <RefreshCw className="w-3.5 h-3.5" /> Rotate
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Active</Label>
                    <Switch checked={incoming.is_active} onCheckedChange={v => toggleActive(incoming, v)} />
                  </div>
                  {incoming.last_event_at && (
                    <p className="text-xs text-slate-400">Last received: {new Date(incoming.last_event_at).toLocaleString()}</p>
                  )}
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 space-y-1">
                    <p className="font-semibold">How to use with Thumbtack</p>
                    <p>Point your Thumbtack lead notifications / Zapier webhook to this URL as a POST request. Send JSON with any of: name, email, phone, address, service_interest. Leads appear with source "other" and the provider in the notes.</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 2. Outbound API connections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="w-4 h-4 text-amber-600" />
                Outbound API Connections
              </CardTitle>
              <CardDescription>
                Store API keys for systems FieldFlow pulls data from (e.g. periodic Thumbtack lead sync).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {outboundApis.length > 0 && (
                <div className="space-y-2">
                  {outboundApis.map(i => (
                    <div key={i.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate">{i.name}</p>
                          <Badge className="bg-slate-100 text-slate-600 capitalize">{PROVIDERS.find(p => p.value === i.provider)?.label || i.provider}</Badge>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{"•".repeat(Math.min(i.api_key?.length || 0, 16))}</p>
                        {i.last_error && <p className="text-xs text-red-500 mt-0.5">{i.last_error}</p>}
                      </div>
                      <Switch checked={i.is_active} onCheckedChange={v => toggleActive(i, v)} />
                      <Button size="sm" variant="ghost" onClick={() => removeIntegration(i.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-lg border border-dashed border-slate-300 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600">Add API connection</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={apiForm.name} onChange={e => setApiForm(f => ({ ...f, name: e.target.value }))} placeholder="Thumbtack Lead Pull" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Provider</Label>
                    <Select value={apiForm.provider} onValueChange={v => setApiForm(f => ({ ...f, provider: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">API key / token</Label>
                    <Input value={apiForm.api_key} onChange={e => setApiForm(f => ({ ...f, api_key: e.target.value }))} placeholder="Paste API key" className="h-8 text-sm font-mono" />
                  </div>
                </div>
                <Button size="sm" onClick={addOutboundApi} disabled={saving}>
                  <Plus className="w-4 h-4" /> Save connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 3. Outbound Webhooks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="w-4 h-4 text-indigo-600" />
                Outbound Webhooks
              </CardTitle>
              <CardDescription>
                Send FieldFlow events to an external URL (e.g. your Zapier/Make catch hook or internal API).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {outboundHooks.length > 0 && (
                <div className="space-y-2">
                  {outboundHooks.map(i => (
                    <div key={i.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{i.name}</p>
                        <p className="text-xs text-slate-400 truncate">{i.webhook_url}</p>
                        {i.events?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {i.events.map(e => <Badge key={e} className="bg-indigo-50 text-indigo-700 text-[10px]">{e}</Badge>)}
                          </div>
                        )}
                      </div>
                      <Switch checked={i.is_active} onCheckedChange={v => toggleActive(i, v)} />
                      <Button size="sm" variant="ghost" onClick={() => removeIntegration(i.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-lg border border-dashed border-slate-300 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600">Add webhook subscription</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={hookForm.name} onChange={e => setHookForm(f => ({ ...f, name: e.target.value }))} placeholder="Zapier catch hook" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Target URL</Label>
                    <Input value={hookForm.webhook_url} onChange={e => setHookForm(f => ({ ...f, webhook_url: e.target.value }))} placeholder="https://hooks.zapier.com/..." className="h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Events to send</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {OUTBOUND_EVENTS.map(ev => (
                      <button
                        key={ev}
                        type="button"
                        onClick={() => toggleEvent(ev)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          hookForm.events.includes(ev) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {ev}
                      </button>
                    ))}
                  </div>
                </div>
                <Button size="sm" onClick={addOutboundWebhook} disabled={saving}>
                  <Plus className="w-4 h-4" /> Save webhook
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Event delivery starts once configured. Outbound webhook delivery uses your company secret for signing.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}