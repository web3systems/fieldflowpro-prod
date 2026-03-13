import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import {
  Plus, DollarSign, Search, ChevronRight, CheckCircle,
  Clock, AlertCircle, Trash2, CreditCard, ExternalLink,
  Download, Mail, Send
} from "lucide-react";
import { downloadInvoicePdf } from "../components/documents/generatePdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { format } from "date-fns";
import ServicePicker from "@/components/services/ServicePicker";

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
  title: "", customer_id: "", job_id: "", status: "draft",
  line_items: [{ ...defaultItem }], subtotal: 0, tax_rate: 0,
  tax_amount: 0, discount: 0, total: 0, amount_paid: 0,
  notes: "", due_date: "", payment_method: ""
};

export default function Invoices() {
  const { activeCompany } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  useEffect(() => {
    if (activeCompany && customers.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const customerId = params.get("customer_id");
      const paymentSuccess = params.get("payment_success");
      const paidInvoiceId = params.get("invoice_id");

      if (paymentSuccess === "true" && paidInvoiceId) {
        base44.entities.Invoice.update(paidInvoiceId, { status: "paid" }).then(() => loadData());
        window.history.replaceState({}, "", window.location.pathname);
      } else if (customerId) {
        const num = `INV-${String(invoices.length + 1).padStart(4, "0")}`;
        const tax_rate = activeCompany?.default_tax_rate || 0;
        setEditing(null);
        setForm({ ...defaultForm, invoice_number: num, customer_id: customerId, line_items: [{ ...defaultItem }], tax_rate });
        setSheetOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [activeCompany, customers]);

  async function loadData() {
    setLoading(true);
    const [inv, c] = await Promise.all([
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
    ]);
    setInvoices(inv);
    setCustomers(c);
    setLoading(false);
  }

  function updateItem(index, field, value) {
    const items = [...form.line_items];
    items[index] = { ...items[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
    }
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total });
  }

  function addItem() {
    setForm({ ...form, line_items: [...form.line_items, { ...defaultItem }] });
  }

  function addServiceAsItem(service) {
    const items = [...form.line_items];
    const last = items[items.length - 1];
    if (last && !last.description && !last.unit_price) {
      items[items.length - 1] = service;
    } else {
      items.push(service);
    }
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total });
  }

  function removeItem(index) {
    const items = form.line_items.filter((_, i) => i !== index);
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total });
  }

  function openCreate() {
    setEditing(null);
    const num = `INV-${String(invoices.length + 1).padStart(4, "0")}`;
    const tax_rate = activeCompany?.default_tax_rate || 0;
    setForm({ ...defaultForm, invoice_number: num, line_items: [{ ...defaultItem }], tax_rate });
    setSheetOpen(true);
  }

  function openEdit(inv) {
    setEditing(inv);
    setForm({ ...defaultForm, ...inv });
    setSheetOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id };
    if (editing) {
      await base44.entities.Invoice.update(editing.id, data);
    } else {
      await base44.entities.Invoice.create(data);
    }
    setSaving(false);
    setSheetOpen(false);
    await loadData();
  }

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.invoice_number?.includes(search);
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const totalPending = invoices.filter(i => ["sent", "viewed", "partial"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
  const totalOverdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + (i.total || 0), 0);

  async function handleSendEmail() {
    setSendingEmail(true);
    const portalUrl = window.location.origin + "/CustomerPortal";
    await base44.functions.invoke("sendInvoiceEmail", {
      invoice_id: editing.id,
      portal_url: portalUrl,
    });
    setSendingEmail(false);
    await loadData();
    setSheetOpen(false);
  }

  function handleDownloadPdf() {
    const customer = customers.find(c => c.id === form.customer_id);
    downloadInvoicePdf({ ...form, id: editing?.id }, customer, activeCompany);
  }

  function handleExportCsv() {
    const rows = [["Invoice #", "Customer", "Status", "Total", "Due Date", "Paid Date"]];
    invoices.forEach(inv => {
      rows.push([
        inv.invoice_number || "",
        getCustomerName(inv.customer_id),
        inv.status || "",
        (inv.total || 0).toFixed(2),
        inv.due_date || "",
        inv.paid_date || "",
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "invoices.csv"; a.click();
  }

  async function handleStripePayment() {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      alert("Payment checkout only works from the published app, not from the preview.");
      return;
    }
    setPaymentLoading(true);
    const currentUrl = window.location.href.split("?")[0];
    const response = await base44.functions.invoke("createStripeCheckout", {
      invoice_id: editing.id,
      success_url: currentUrl,
      cancel_url: currentUrl,
    });
    setPaymentLoading(false);
    if (response.data?.url) {
      window.location.href = response.data.url;
    } else {
      alert(response.data?.error || "Failed to create payment session.");
    }
  }

  const getCustomerName = (id) => {
    const c = customers.find(c => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">{invoices.length} invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2 hidden sm:flex">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xs text-green-600 font-medium">Collected</p>
          <p className="text-lg font-bold text-green-700">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-xs text-amber-600 font-medium">Pending</p>
          <p className="text-lg font-bold text-amber-700">${totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-xs text-red-600 font-medium">Overdue</p>
          <p className="text-lg font-bold text-red-700">${totalOverdue.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice number..." className="pl-9 bg-white" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_STYLES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No invoices yet</p>
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Create Invoice</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => {
            const statusInfo = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
            return (
              <Card key={inv.id} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => openEdit(inv)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-400">{inv.invoice_number}</span>
                        <Badge className={`text-xs ${statusInfo.style}`}>{statusInfo.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-medium text-slate-700">{getCustomerName(inv.customer_id)}</span>
                        {inv.due_date && (
                          <span className="text-xs text-slate-400">Due {format(new Date(inv.due_date), "MMM d, yyyy")}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-slate-800">${(inv.total || 0).toLocaleString()}</p>
                      {inv.amount_paid > 0 && inv.amount_paid < inv.total && (
                        <p className="text-xs text-slate-400">${inv.amount_paid} paid</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? `Invoice ${editing.invoice_number}` : "New Invoice"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_STYLES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <Label>Amount Paid ($)</Label>
                <Input type="number" value={form.amount_paid} onChange={e => setForm({ ...form, amount_paid: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <div className="flex items-center gap-2">
                  <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} />
                  <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Line
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {form.line_items.map((item, idx) => (
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
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
                    setForm({ ...form, tax_rate, tax_amount, total });
                  }} className="w-20 h-7 text-sm bg-white" />
                  <span className="text-sm text-slate-500">${(form.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span>${(form.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            {editing && (
              <div className="flex gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  className="flex-1 gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
                {customers.find(c => c.id === form.customer_id)?.email && !["paid", "void"].includes(form.status) && (
                  <Button
                    variant="outline"
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="flex-1 gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Mail className="w-4 h-4" />
                    {sendingEmail ? "Sending..." : "Send to Customer"}
                  </Button>
                )}
              </div>
            )}

            {editing && !["paid", "void"].includes(form.status) && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 mb-2 font-medium">Collect Payment</p>
                <Button
                  onClick={handleStripePayment}
                  disabled={paymentLoading}
                  className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
                >
                  <CreditCard className="w-4 h-4" />
                  {paymentLoading ? "Redirecting..." : `Pay $${((form.total || 0) - (form.amount_paid || 0)).toFixed(2)} via Stripe`}
                  <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                </Button>
                <p className="text-xs text-slate-400 mt-1.5 text-center">Customer will be redirected to a secure Stripe checkout page</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Invoice"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}