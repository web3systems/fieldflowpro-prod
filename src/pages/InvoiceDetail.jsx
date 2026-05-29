import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, DollarSign, User, Calendar, CreditCard, Mail,
  Download, Save, Edit2, Plus, Trash2, CheckCircle, AlertCircle, Clock, ExternalLink,
  Phone, MapPin, Banknote
} from "lucide-react";
import RecordPaymentModal from "@/components/invoices/RecordPaymentModal";
import ManualChargeModal from "@/components/invoices/ManualChargeModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import ServicePicker from "@/components/services/ServicePicker";
import DraggableLineItemsSection from "@/components/services/DraggableLineItemsSection";
import LineItemRow from "@/components/services/LineItemRow";
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
  const [showPreview, setShowPreview] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showManualCharge, setShowManualCharge] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [services, setServices] = useState([]);

  const loadData = useCallback(async () => {
    const [invs, c, svcs] = await Promise.all([
      base44.entities.Invoice.filter({ id }),
      activeCompany ? base44.entities.Customer.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
      activeCompany ? base44.entities.Service.filter({ company_id: activeCompany.id, is_active: true }) : Promise.resolve([]),
    ]);
    setServices(svcs);
    if (invs.length > 0) { setInvoice(invs[0]); setForm({ ...defaultForm, ...invs[0] }); }
    setCustomers(c);
    setLoading(false);
  }, [id, activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle return from deposit checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("deposit_success") === "true") {
      const amount = parseFloat(params.get("deposit_amount") || "0");
      if (amount > 0 && invoice) {
        const newAmountPaid = (invoice.amount_paid || 0) + amount;
        const newStatus = newAmountPaid >= invoice.total ? "paid" : "partial";
        base44.entities.Invoice.update(id, { amount_paid: newAmountPaid, status: newStatus })
          .then(loadData);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [invoice]);

  async function handleDepositCheckout() {
    if (window.self !== window.top) { alert("Payment checkout only works from the published app, not from the preview."); return; }
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    setDepositLoading(true);
    const currentUrl = window.location.href.split("?")[0];
    const response = await base44.functions.invoke("createInvoiceDepositCheckout", {
      invoice_id: id,
      deposit_amount: amount,
      success_url: currentUrl,
      cancel_url: currentUrl,
    });
    setDepositLoading(false);
    if (response.data?.url) window.location.href = response.data.url;
    else alert(response.data?.error || "Failed to create deposit session.");
  }

  function updateItem(index, field, value) {
    const items = [...form.line_items];
    if (field === null && typeof value === "object") {
      items[index] = value;
    } else {
      items[index] = { ...items[index], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
      }
    }
    recalc(items);
  }

  function recalc(items) {
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const taxableSubtotal = items.filter(i => i.category === "materials").reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = taxableSubtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm(f => ({ ...f, line_items: items, subtotal, tax_amount, total }));
  }

  function addItemWithCategory(category) {
    setForm(f => ({ ...f, line_items: [...f.line_items, { ...defaultItem, category }] }));
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

  async function handleDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    await base44.entities.Invoice.delete(id);
    navigate(createPageUrl("Invoices"));
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
    try {
      const portalUrl = window.location.origin + "/CustomerPortal";
      await base44.functions.invoke("sendInvoiceEmail", { invoice_id: id, portal_url: portalUrl });
      await base44.entities.Invoice.update(id, { status: "sent" });
      alert("Invoice sent successfully!");
      navigate(createPageUrl("Invoices"));
    } finally {
      setSendingEmail(false);
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

  if (!invoice) return (
    <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-4 pt-20">
      <p>Invoice not found.</p>
      <button onClick={() => navigate(createPageUrl("Invoices"))} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
        Back to Invoices
      </button>
    </div>
  );

  const statusInfo = STATUS_STYLES[form.status] || STATUS_STYLES.draft;

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      {showRecordPayment && invoice && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setShowRecordPayment(false)}
          onSaved={() => { setShowRecordPayment(false); loadData(); }}
        />
      )}

      {showManualCharge && invoice && (
        <ManualChargeModal
          invoice={invoice}
          amountDue={amountDue}
          onSuccess={() => { setShowManualCharge(false); loadData(); }}
          onClose={() => setShowManualCharge(false)}
        />
      )}

      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Collect Deposit</h2>
            <p className="text-sm text-slate-500 mb-4">Invoice total: <strong>${(form.total || 0).toFixed(2)}</strong>. Enter the deposit amount to charge via Stripe.</p>
            <Label className="text-sm">Deposit Amount ($)</Label>
            <Input
              type="number"
              className="mt-1 mb-4"
              placeholder="e.g. 500"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDepositModal(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                disabled={depositLoading || !depositAmount || parseFloat(depositAmount) <= 0}
                onClick={handleDepositCheckout}
              >
                {depositLoading ? "Redirecting..." : "Charge via Stripe"}
              </Button>
            </div>
          </div>
        </div>
      )}
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
          {customer?.email && (
            <Button size="sm" variant="outline" onClick={handleSendEmail} disabled={sendingEmail} className="gap-1 text-xs hidden sm:flex border-blue-200 text-blue-600 hover:bg-blue-50">
              <Mail className="w-3.5 h-3.5" />{sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleDelete} className="gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
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

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Actions</p>
              {canPay && (
                <>
                  <Button onClick={handleStripePayment} disabled={paymentLoading} className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
                    <CreditCard className="w-4 h-4" />
                    {paymentLoading ? "Redirecting..." : `Send Payment Link`}
                    <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                  </Button>
                  <Button onClick={() => setShowManualCharge(true)} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                    <CreditCard className="w-4 h-4" /> Charge Card Manually
                  </Button>
                  <Button variant="outline" onClick={() => setShowRecordPayment(true)} className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50">
                    <Banknote className="w-4 h-4" /> Record Manual Payment
                  </Button>
                  <p className="text-xs text-slate-400 text-center">Cash, check, Zelle, or any other method</p>
                </>
              )}
              {form.status === "paid" && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Paid in full</p>
                    {form.paid_date && <p className="text-xs text-green-600">{format(new Date(form.paid_date), "MMM d, yyyy")} · {form.payment_method || ""}</p>}
                  </div>
                </div>
              )}
              {canPay && (
                <Button variant="outline" onClick={() => { setDepositAmount(""); setShowDepositModal(true); }} className="w-full gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
                  <DollarSign className="w-4 h-4" /> Collect Deposit
                </Button>
              )}
              {customer?.email && (
                <Button variant="outline" onClick={handleSendEmail} disabled={sendingEmail} className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
                  <Mail className="w-4 h-4" />{sendingEmail ? "Sending..." : "Email Invoice to Customer"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Preview / Edit toggle */}
          <div className="flex gap-2">
            <Button 
              variant={showPreview ? "outline" : "default"} 
              onClick={() => setShowPreview(false)}
              className="text-sm"
            >
              Edit
            </Button>
            <Button 
              variant={showPreview ? "default" : "outline"} 
              onClick={() => setShowPreview(true)}
              className="text-sm"
            >
              Preview
            </Button>
          </div>

          {showPreview ? (
            <div className="overflow-x-auto bg-slate-100 p-4 rounded-xl">
              <InvoiceEstimatePreview 
                document={form}
                customer={customers.find(c => c.id === form.customer_id)}
                company={activeCompany}
                type="invoice"
                template={null}
              />
            </div>
          ) : (
          <>
          {/* Mobile info */}
          <div className="lg:hidden">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold text-slate-800 text-sm">{getCustomerName(form.customer_id)}</p>
                {customer?.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Phone className="w-3 h-3" />{customer.phone}</a>}
                {customer?.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Mail className="w-3 h-3" />{customer.email}</a>}
                {customer?.address && <p className="text-xs text-slate-600 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />{customer.address}{customer.city ? `, ${customer.city}` : ""}{customer.state ? `, ${customer.state}` : ""} {customer.zip || ""}</p>}
                {form.due_date && <p className="text-xs text-slate-400">Due: {format(new Date(form.due_date), "MMM d, yyyy")}</p>}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Total</span>
                  <span className="font-bold text-slate-900">${(form.total || 0).toLocaleString()}</span>
                </div>
                {canPay && (
                  <>
                    <Button onClick={handleStripePayment} disabled={paymentLoading} className="w-full gap-2 bg-violet-600 hover:bg-violet-700 mt-1">
                      <CreditCard className="w-4 h-4" />
                      {paymentLoading ? "Redirecting..." : `Send Payment Link`}
                    </Button>
                    <Button onClick={() => setShowManualCharge(true)} className="w-full gap-2 bg-blue-600 hover:bg-blue-700 mt-1">
                      <CreditCard className="w-4 h-4" /> Charge Card Manually
                    </Button>
                    <Button variant="outline" onClick={() => setShowRecordPayment(true)} className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50 mt-1">
                      <Banknote className="w-4 h-4" /> Record Manual Payment
                    </Button>
                  </>
                )}
                {form.status === "paid" && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 mt-1">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm font-medium">Paid in full {form.paid_date ? `· ${format(new Date(form.paid_date), "MMM d")}` : ""}</p>
                  </div>
                )}
                {customer?.email && (
                  <Button variant="outline" onClick={handleSendEmail} disabled={sendingEmail} className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 mt-1">
                    <Mail className="w-4 h-4" />{sendingEmail ? "Sending..." : "Email Invoice to Customer"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Labor & Materials with drag-and-drop */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4">
              <DraggableLineItemsSection
                items={form.line_items || []}
                laborCategory="labor"
                materialCategory="materials"
                onReorder={newItems => recalc(newItems)}
                renderLaborHeader={() => (
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-base">Labor</CardTitle>
                  <div className="flex items-center gap-2">
                    <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} category="labor" />
                    <Button variant="outline" size="sm" onClick={() => addItemWithCategory("labor")} className="gap-1"><Plus className="w-3 h-3" /> Add</Button>
                  </div>
                </div>
                )}
                renderMaterialHeader={() => (
                <div className="flex items-center justify-between mt-4 mb-2 pt-4 border-t border-slate-200">
                  <CardTitle className="text-base">Materials</CardTitle>
                  <div className="flex items-center gap-2">
                    <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} category="materials" />
                    <Button variant="outline" size="sm" onClick={() => addItemWithCategory("materials")} className="gap-1"><Plus className="w-3 h-3" /> Add</Button>
                  </div>
                </div>
                )}
                renderItem={(item, origIdx) => (
                  <LineItemRow
                    item={item}
                    idx={origIdx}
                    companyId={activeCompany?.id}
                    services={services}
                    onServicesUpdate={svc => setServices(prev => [...prev, svc])}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                  />
                )}
              />
            </CardContent>
          </Card>

           {/* Summary */}
           <Card className="border-0 shadow-sm">
             <CardContent className="pt-6">


              {(() => {
                const laborSubtotal = (form.line_items || []).filter(i => i.category !== "materials").reduce((s, i) => s + (i.total || 0), 0);
                const materialsSubtotal = (form.line_items || []).filter(i => i.category === "materials").reduce((s, i) => s + (i.total || 0), 0);
                return (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Labor Subtotal <span className="text-xs text-slate-400">(not taxed)</span></span>
                    <span className="font-medium">${laborSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Materials Subtotal <span className="text-xs text-slate-400">(taxed)</span></span>
                    <span className="font-medium">${materialsSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                    <span className="text-sm text-slate-600 flex-1">Tax Rate (%)</span>
                    <Input type="number" value={form.tax_rate} onChange={e => {
                      const tax_rate = parseFloat(e.target.value) || 0;
                      const tax_amount = materialsSubtotal * (tax_rate / 100);
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
                );
              })()}
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
          </>
          )}
        </div>
      </div>
    </div>
  );
}