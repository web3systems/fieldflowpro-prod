import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Bot, CheckCircle, Edit3, Save, Send, Sparkles, Mail, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AIEstimatorChat from "@/components/estimates/AIEstimatorChat";
import { downloadEstimatePdf } from "@/components/documents/generatePdf";

export default function AIEstimator() {
  const navigate = useNavigate();
  const { activeCompany } = useApp();

  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Phase: "chat" | "review" | "saved"
  const [phase, setPhase] = useState("chat");
  const [draftEstimate, setDraftEstimate] = useState(null);
  const [savedEstimate, setSavedEstimate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    const [c, svcs] = await Promise.all([
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Service.filter({ company_id: activeCompany.id, is_active: true }),
    ]);
    setCustomers(c);
    setServices(svcs);
    setLoading(false);
  }

  function handleEstimateReady(data) {
    // Set defaults and clean up
    const lineItems = (data.line_items || []).map(item => ({
      service_id: item.service_id || null,
      description: item.description || "",
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total: item.total || (item.quantity || 1) * (item.unit_price || 0),
    }));
    const subtotal = lineItems.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((data.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (data.discount || 0);

    setDraftEstimate({
      ...data,
      line_items: lineItems,
      subtotal,
      tax_amount,
      total,
      status: "draft",
    });
    setPhase("review");
  }

  async function handleSave() {
    setSaving(true);
    const estimates = await base44.entities.Estimate.filter({ company_id: activeCompany.id });
    const num = `EST-${String(estimates.length + 1).padStart(4, "0")}`;
    const created = await base44.entities.Estimate.create({
      ...draftEstimate,
      company_id: activeCompany.id,
      estimate_number: num,
    });
    setSavedEstimate(created);
    setSaving(false);
    setPhase("saved");
  }

  async function handleSendEmail() {
    if (!savedEstimate) return;
    setSendingEmail(true);
    await base44.functions.invoke("sendEstimateOrInvoice", {
      estimate_id: savedEstimate.id,
      customer_id: savedEstimate.customer_id,
      company_id: activeCompany?.id,
      contact_method: "email",
    });
    await base44.entities.Estimate.update(savedEstimate.id, { status: "sent" });
    setSendingEmail(false);
    alert("Estimate sent to customer!");
    navigate(createPageUrl("Estimates"));
  }

  function handleDownloadPdf() {
    const customer = customers.find(c => c.id === (savedEstimate || draftEstimate)?.customer_id);
    downloadEstimatePdf(savedEstimate || { ...draftEstimate, id: "preview" }, customer, activeCompany);
  }

  function getCustomerName(id) {
    const c = customers.find(c => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  }

  function updateLineItem(idx, field, value) {
    const items = [...draftEstimate.line_items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      items[idx].total = (items[idx].quantity || 0) * (items[idx].unit_price || 0);
    }
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((draftEstimate.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (draftEstimate.discount || 0);
    setDraftEstimate(d => ({ ...d, line_items: items, subtotal, tax_amount, total }));
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("Estimates"))} className="gap-1 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Estimates
        </Button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">AI Estimator</h1>
            <p className="text-xs text-slate-500">Chat to build a professional estimate</p>
          </div>
        </div>
        {phase !== "chat" && (
          <div className="ml-auto">
            <Badge className={phase === "saved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
              {phase === "saved" ? "✓ Saved" : "Review"}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Chat panel */}
        <div className={`flex flex-col border-r border-slate-200 bg-white ${phase === "chat" ? "flex-1" : "w-96 flex-shrink-0"}`}>
          {phase === "chat" ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <p className="text-sm text-purple-700 font-medium">AI will ask questions and automatically generate the estimate when ready</p>
              </div>
              <div className="flex-1 min-h-0">
                <AIEstimatorChat
                  customers={customers}
                  services={services}
                  company={activeCompany}
                  onEstimateReady={handleEstimateReady}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700 font-medium">Estimate ready! Review it on the right.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-500">
                <p className="font-medium text-slate-700 mb-2">Conversation summary:</p>
                <p className="italic">"{draftEstimate?.summary || draftEstimate?.title}"</p>
                <button
                  onClick={() => { setPhase("chat"); setDraftEstimate(null); setSavedEstimate(null); }}
                  className="mt-4 text-blue-600 hover:text-blue-700 text-xs underline"
                >
                  Start over with new estimate
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Review panel — only shown after estimate is ready */}
        {phase !== "chat" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-slate-400" />
                Review & Edit Estimate
              </h2>
              {phase === "review" && (
                <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save to Customer Account"}
                </Button>
              )}
              {phase === "saved" && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadPdf} className="gap-1 text-xs">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </Button>
                  <Button onClick={handleSendEmail} disabled={sendingEmail} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Mail className="w-4 h-4" />
                    {sendingEmail ? "Sending..." : "Send to Customer"}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/EstimateDetail/${savedEstimate.id}`)} className="gap-1 text-xs">
                    Open Full Detail
                  </Button>
                </div>
              )}
            </div>

            {phase === "saved" && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Saved to customer account!</p>
                  <p className="text-xs text-green-600">Estimate #{savedEstimate?.estimate_number} is now in the system. You can send it to the customer or open it for full editing.</p>
                </div>
              </div>
            )}

            {/* Estimate form */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Title</Label>
                    <Input
                      value={draftEstimate?.title || ""}
                      onChange={e => setDraftEstimate(d => ({ ...d, title: e.target.value }))}
                      disabled={phase === "saved"}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Customer</Label>
                    <Select
                      value={draftEstimate?.customer_id || ""}
                      onValueChange={v => setDraftEstimate(d => ({ ...d, customer_id: v }))}
                      disabled={phase === "saved"}
                    >
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line items */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Line Items</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-400 uppercase tracking-wide px-2 mb-1">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2">Unit $</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                {(draftEstimate?.line_items || []).map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 rounded-lg">
                    <div className="col-span-6">
                      <Input
                        value={item.description}
                        onChange={e => updateLineItem(idx, "description", e.target.value)}
                        disabled={phase === "saved"}
                        className="text-sm h-8 bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                        disabled={phase === "saved"}
                        className="text-sm h-8 bg-white text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        disabled={phase === "saved"}
                        className="text-sm h-8 bg-white"
                      />
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold text-slate-700">
                      ${(item.total || 0).toFixed(2)}
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="border-t border-slate-200 pt-3 mt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">${(draftEstimate?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Tax rate</span>
                      <Input
                        type="number"
                        value={draftEstimate?.tax_rate || 0}
                        onChange={e => {
                          const tax_rate = parseFloat(e.target.value) || 0;
                          const tax_amount = (draftEstimate?.subtotal || 0) * (tax_rate / 100);
                          const total = (draftEstimate?.subtotal || 0) + tax_amount - (draftEstimate?.discount || 0);
                          setDraftEstimate(d => ({ ...d, tax_rate, tax_amount, total }));
                        }}
                        disabled={phase === "saved"}
                        className="w-16 h-7 text-sm bg-white"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                    <span>${(draftEstimate?.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-200">
                    <span>Total</span>
                    <span className="text-blue-600">${(draftEstimate?.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {phase === "review" && (
              <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-blue-600 hover:bg-blue-700 h-11">
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Estimate to Customer Account"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}