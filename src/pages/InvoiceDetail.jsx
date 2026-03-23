import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, DollarSign, User, Calendar, CreditCard, Mail,
  Download, Save, Edit2, Plus, Trash2, CheckCircle, AlertCircle, Clock, ExternalLink,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import ServicePicker from "@/components/services/ServicePicker";
import { downloadInvoicePdf } from "../components/documents/generatePdf";
import InvoiceEstimatePreview from "@/components/documents/InvoiceEstimatePreview";

const STATUS_STYLES = {
  draft: { label: "Draft", style: "bg-gray-100 text-gray-600", icon: Clock },
  sent: { label: "Sent", style: "bg-blue-100 text-blue-700", icon: Clock },
  viewed: { label: "Viewed", style: "bg-purple-100 text-purple-700", icon: Clock },
  paid: { label: "Paid", style: "bg-green-100 text-green-700", icon: CheckCircle },
  partial: { label: "Partial", style: "bg-amber-100 text-amber-700", icon: Clock },
  overdue: { label: "Overdue", style: "bg-red-100 text-red-700", icon: AlertCircle },
  void: { label: "Void", style: "bg-gray-100 text-gray-500", icon: Clock },
};

const defaultItem = { description: "", quantity: 1, unit_price: 0, total: 0 };
const defaultForm = {
  customer_id: "", status: "draft", line_items: [{ ...defaultItem }],
  subtotal: 0, tax_rate: 0, tax_amount: 0, discount: 0, total: 0,
  amount_paid: 0, notes: "", due_date: "", payment_method: ""
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeCompany } = useApp();

  const [invoice, setInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editingInfo, setEditingInfo] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);

  const loadData = useCallback(async () => {
    const [invs, c] = await Promise.all([
      base44.entities.Invoice.filter({ id }),
      activeCompany ? base44.entities.Customer.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
    ]);
    if (invs.length > 0) { setInvoice(invs[0]); setForm({ ...defaultForm, ...invs[0] }); }
    setCustomers(c);
    setLoading(false);
  }, [id, activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateItem(index, field, value) {
    const items = [...form.line_items];
    items[index] = { ...items[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
    }
    recalc(items);
  }

  function recalc(items) {
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm(f => ({ ...f, line_items: items, subtotal, tax_amount, total }));
  }

  function addItem() {
    setForm(f => ({ ...f, line_items: [...f.line_items, { ...defaultItem }] }));
  }

  function addServiceAsItem(service) {
    const items = [...form.line_items];
    const last = items[items.length - 1];
    if (last && !last.description && !last.unit_price) items[items.length - 1] = service;
    else items.push(service);
    recalc(items);
  }

  function removeItem(index) {
    const items = form.line_items.filter((_, i) => i !== index);
    recalc(items);
  }

  async function handleSave() {
    setSaving(true);
    await base44.entities.Invoice.update(id, form);
    setInvoice(inv => ({ ...inv, ...form }));
    setSaving(false);
    setEditingInfo(false);
  }

  async function handleSendEmail() {
    setSendingEmail(true);
    const portalUrl = window.location.origin + "/CustomerPortal";
    await base44.functions.invoke("sendInvoiceEmail", { invoice_id: id, portal_url: portalUrl });
    setSendingEmail(false);
    await loadData();
  }

  async function handleSendSms() {
    setSendingSms(true);
    try {
      await base44.functions.invoke("sendEstimateOrInvoice", {
        invoice_id: id,
        customer_id: form.customer_id,
        contact_method: "sms",
      });
    } finally {
      setSendingSms(false);
    }
  }

  function handleDownloadPdf() {
    const customer = customers.find(c => c.id === form.customer_id);
    downloadInvoicePdf({ ...form, id }, customer, activeCompany);
  }

  async function handleStripePayment() {
    const isInIframe = window.self !== window.top;
    if (isInIframe) { alert("Payment checkout only works from the published app, not from the preview."); return; }
    setPaymentLoading(true);
    const currentUrl = window.location.href.split("?")[0];
    const response = await base44.functions.invoke("createStripeCheckout", {
      invoice_id: id,
      success_url: currentUrl,
      cancel_url: currentUrl,
    });
    setPaymentLoading(false);
    if (response.data?.url) window.location.href = response.data.url;
    else alert(response.data?.error || "Failed to create payment session.");
  }

  const getCustomerName = (cid) => {
    const c = customers.find(c => c.id === cid);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  const customer = customers.find(c => c.id === form.customer_id);
  const amountDue = (form.total || 0) - (form.amount_paid || 0);
  const canPay = !["paid", "void"].includes(form.status);

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!invoice) return <div className="p-6 text-center text-slate-500">Invoice not found.</div>;

  const statusInfo = STATUS_STYLES[form.status] || STATUS_STYLES.draft;

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("Invoices"))} className="gap-1 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Invoices
        </Button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white flex-shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{form.invoice_number || "Invoice"}</h1>
            </div>
            <Badge className={`text-xs mt-0.5 ${statusInfo.style}`}>{statusInfo.label}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} className="gap-1 text-xs hidden sm:flex">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          {customer?.email && canPay && (
            <Button size="sm" variant="outline" onClick={handleSendEmail} disabled={sendingEmail} className="gap-1 text-xs hidden sm:flex border-blue-200 text-blue-600 hover:bg-blue-50">
              <Mail className="w-3.5 h-3.5" />{sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</p>
                <button onClick={() => setEditingInfo(!editingInfo)} className="text-slate-400 hover:text-blue-600">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {editingInfo ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Customer</Label>
                    <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_STYLES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Due Date</Label>
                    <Input type="date" value={form.due_date || ""} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Amount Paid ($)</Label>
                    <Input type="number" value={form.amount_paid || 0} onChange={e => setForm(f => ({ ...f, amount_paid: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                  </div>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="w-full gap-1 bg-blue-600 hover:bg-blue-700">
                    <Save className="w-3 h-3" />{saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm"><User className="w-3.5 h-3.5 text-slate-400" /><span className="text-slate-700">{getCustomerName(form.customer_id)}</span></div>
                  {form.due_date && (
                    <div className="flex items-center gap-2 text-sm"><Calendar className="w-3.5 h-3.5 text-slate-400" /><span className="text-slate-600">Due {format(new Date(form.due_date), "MMM d, yyyy")}</span></div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="font-bold text-slate-900">${(form.total || 0).toLocaleString()}</span>
                  </div>
                  {form.amount_paid > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Paid</span>
                      <span className="text-green-600 font-medium text-sm">${form.amount_paid.toLocaleString()}</span>
                    </div>
                  )}
                  {amountDue > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Due</span>
                      <span className="text-red-600 font-medium text-sm">${amountDue.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {canPay && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Payment</p>
                <Button onClick={handleStripePayment} disabled={paymentLoading} className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
                  <CreditCard className="w-4 h-4" />
                  {paymentLoading ? "Redirecting..." : `Pay $${amountDue.toFixed(2)} via Stripe`}
                  <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                </Button>
                <p className="text-xs text-slate-400 text-center">Customer redirected to secure Stripe checkout</p>
                {customer?.email && (
                  <Button variant="outline" onClick={handleSendEmail} disabled={sendingEmail} className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
                    <Mail className="w-4 h-4" />{sendingEmail ? "Sending..." : "Email to Customer"}
                  </Button>
                )}
                {customer?.phone && (
                  <Button variant="outline" onClick={handleSendSms} disabled={sendingSms} className="w-full gap-2 border-green-200 text-green-600 hover:bg-green-50">
                    <MessageSquare className="w-4 h-4" />{sendingSms ? "Sending..." : "SMS to Customer"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile info */}
          <div className="lg:hidden">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm"><User className="w-3.5 h-3.5 text-slate-400" /><span>{getCustomerName(form.customer_id)}</span></div>
                <div className="flex items-center gap-2 text-sm"><DollarSign className="w-3.5 h-3.5 text-slate-400" /><span className="font-semibold">${(form.total || 0).toLocaleString()}</span></div>
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <div className="flex items-center gap-2">
                  <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} />
                  <Button variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="w-3 h-3" /> Add Line</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {form.line_items?.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg">
                  <div className="col-span-5">
                    <Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Description" className="bg-white text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qty" className="bg-white text-sm text-center" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} placeholder="Price" className="bg-white text-sm" />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium">${(item.total || 0).toFixed(2)}</div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}

              <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">${(form.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 flex-1">Tax Rate (%)</span>
                  <Input type="number" value={form.tax_rate} onChange={e => {
                    const tax_rate = parseFloat(e.target.value) || 0;
                    const tax_amount = form.subtotal * (tax_rate / 100);
                    const total = form.subtotal + tax_amount - (form.discount || 0);
                    setForm(f => ({ ...f, tax_rate, tax_amount, total }));
                  }} className="w-20 h-7 text-sm bg-white" />
                  <span className="text-sm text-slate-500">${(form.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span>${(form.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Notes..." />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}