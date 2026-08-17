import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { ArrowLeft, Plus, DollarSign, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import ServicePicker from "@/components/services/ServicePicker";
import InvoiceSaveDropdown from "@/components/invoices/InvoiceSaveDropdown";
import { useToast } from "@/components/ui/use-toast";
import { format, addDays } from "date-fns";

const PAYMENT_TERMS = [
  { value: "due_on_receipt", label: "Due on Receipt", days: 0 },
  { value: "net_7", label: "Net 7", days: 7 },
  { value: "net_14", label: "Net 14", days: 14 },
  { value: "net_30", label: "Net 30", days: 30 },
  { value: "custom", label: "Custom", days: null },
];

const defaultItem = { service_id: null, description: "", notes: "", quantity: 1, unit_price: 0, total: 0, category: "service" };
const defaultForm = {
  subject: "",
  customer_id: "",
  job_id: "",
  status: "draft",
  payment_terms: "due_on_receipt",
  issued_date: format(new Date(), "yyyy-MM-dd"),
  due_date: format(new Date(), "yyyy-MM-dd"),
  invoice_number: "",
  line_items: [{ ...defaultItem }],
  subtotal: 0, tax_rate: 0, tax_amount: 0, discount: 0, total: 0, amount_paid: 0,
  notes: "",
};

export default function NewInvoice() {
  const navigate = useNavigate();
  const { activeCompany } = useApp();
  const { toast } = useToast();
  const [form, setForm] = useState(defaultForm);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeCompany) return;
    Promise.all([
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Service.filter({ company_id: activeCompany.id, is_active: true }),
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
    ]).then(([c, s, invs]) => {
      setCustomers(c);
      setServices(s);
      const invoice_number = `INV-${String(invs.length + 1).padStart(4, "0")}`;
      const tax_rate = activeCompany?.default_tax_rate || 0;
      setForm(f => ({ ...f, invoice_number, tax_rate }));
    });
    const customerId = new URLSearchParams(window.location.search).get("customer_id");
    if (customerId) setForm(f => ({ ...f, customer_id: customerId }));
  }, [activeCompany]);

  function calcTotals(items, tax_rate, discount) {
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const taxable = items.filter(i => i.category === "materials" || i.category === "material").reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = taxable * ((tax_rate || 0) / 100);
    return { subtotal, tax_amount, total: subtotal + tax_amount - (discount || 0) };
  }

  function updateItem(index, field, value) {
    const items = [...form.line_items];
    items[index] = { ...items[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
    }
    setForm({ ...form, line_items: items, ...calcTotals(items, form.tax_rate, form.discount) });
  }

  function addItem(category = "service") {
    setForm({ ...form, line_items: [...form.line_items, { ...defaultItem, category }] });
  }

  function addServiceAsItem(service) {
    const items = [...form.line_items];
    const last = items[items.length - 1];
    if (last && !last.description && !last.unit_price) items[items.length - 1] = service;
    else items.push(service);
    setForm({ ...form, line_items: items, ...calcTotals(items, form.tax_rate, form.discount) });
  }

  function removeItem(index) {
    const items = form.line_items.filter((_, i) => i !== index);
    setForm({ ...form, line_items: items, ...calcTotals(items, form.tax_rate, form.discount) });
  }

  function setPaymentTerms(value) {
    const term = PAYMENT_TERMS.find(t => t.value === value);
    let due_date = form.due_date;
    if (term && term.days !== null) {
      due_date = format(addDays(new Date(form.issued_date || new Date()), term.days), "yyyy-MM-dd");
    }
    setForm({ ...form, payment_terms: value, due_date });
  }

  const invoiceBalance = (form.total || 0) - (form.amount_paid || 0);

  async function createInvoice() {
    const created = await base44.entities.Invoice.create({ ...form, company_id: activeCompany.id });
    return created;
  }

  async function handleSave(mode) {
    if (!form.customer_id) {
      toast({ title: "Select a client first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await createInvoice();
      if (mode === "save") {
        navigate(`/InvoiceDetail/${created.id}`);
        return;
      }
      if (mode === "email" || mode === "sms") {
        await base44.functions.invoke("sendEstimateOrInvoice", {
          doc_type: "invoice",
          doc_id: created.id,
          contact_method: mode,
        });
        toast({ title: `Invoice saved and sent via ${mode === "email" ? "email" : "text"}` });
        navigate(`/InvoiceDetail/${created.id}`);
        return;
      }
      if (mode === "collect") {
        navigate(`/InvoiceDetail/${created.id}?collect=1`);
        return;
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const getCustomerName = (id) => {
    const c = customers.find(c => c.id === id);
    return c ? (c.business_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—") : "—";
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/Invoices")} className="gap-1 text-slate-500">
            <ArrowLeft className="w-4 h-4" /> Invoices
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-800">New Invoice</span>
          </div>
        </div>
        <InvoiceSaveDropdown onSave={handleSave} disabled={!form.customer_id} saving={saving} />
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">

        {/* Subject + Client */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</Label>
              <Input
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="What is this invoice for?"
                className="mt-1 text-base font-medium h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</Label>
              <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{getCustomerName(c.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoice meta — right-aligned compact block */}
        <div className="flex justify-end">
          <Card className="border border-slate-200 shadow-sm w-full sm:w-80">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Invoice #</span>
                <span className="font-mono font-medium text-slate-800">{form.invoice_number || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Issued</span>
                <Input
                  type="date"
                  value={form.issued_date}
                  onChange={e => setForm({ ...form, issued_date: e.target.value })}
                  className="h-8 w-36 text-sm text-right"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Payment Terms</span>
                <Select value={form.payment_terms} onValueChange={setPaymentTerms}>
                  <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Due Date</span>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className="h-8 w-36 text-sm text-right"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Products & Services</h3>
              <div className="flex items-center gap-2">
                <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} itemType="service" />
                <Button variant="outline" size="sm" onClick={() => addItem("service")} className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Add Line Item
                </Button>
              </div>
            </div>
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              <div className="col-span-5">Name</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1" />
            </div>
            <div className="space-y-2">
              {form.line_items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start px-2 py-2 rounded-lg hover:bg-slate-50">
                  <div className="col-span-5 space-y-1">
                    <Input
                      value={item.description || ""}
                      onChange={e => updateItem(idx, "description", e.target.value)}
                      placeholder="Item name"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={item.notes || ""}
                      onChange={e => updateItem(idx, "notes", e.target.value)}
                      placeholder="Description (optional)"
                      className="h-7 text-xs text-slate-500 border-slate-100"
                    />
                  </div>
                  <Input
                    type="number"
                    value={item.quantity || 0}
                    onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                    className="col-span-2 h-8 text-sm text-center"
                  />
                  <Input
                    type="number"
                    value={item.unit_price || 0}
                    onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                    className="col-span-2 h-8 text-sm text-right"
                  />
                  <div className="col-span-2 text-right text-sm font-medium text-slate-800 pt-1.5">
                    ${(item.total || 0).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="col-span-1 h-8 flex items-center justify-center text-slate-300 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => addItem("service")} className="gap-1 text-xs text-blue-600 mt-3">
              <Plus className="w-3 h-3" /> Add Line Item
            </Button>
          </CardContent>
        </Card>

        {/* Totals + Notes — two column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Notes */}
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={4}
                placeholder="Notes for the client..."
                className="mt-2 resize-none text-sm"
              />
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-800">${(form.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 flex-1">Discount</span>
                <Input
                  type="number"
                  value={form.discount || 0}
                  onChange={e => {
                    const discount = parseFloat(e.target.value) || 0;
                    setForm({ ...form, discount, ...calcTotals(form.line_items, form.tax_rate, discount) });
                  }}
                  className="w-20 h-7 text-sm text-right"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 flex-1">Tax Rate (%)</span>
                <Input
                  type="number"
                  value={form.tax_rate || 0}
                  onChange={e => {
                    const tax_rate = parseFloat(e.target.value) || 0;
                    setForm({ ...form, tax_rate, ...calcTotals(form.line_items, tax_rate, form.discount) });
                  }}
                  className="w-20 h-7 text-sm text-right"
                />
                <span className="text-sm text-slate-500 w-16 text-right">${(form.tax_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
                <span>Total</span>
                <span className="text-blue-600">${(form.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-slate-500">Invoice Balance</span>
                <span className="font-semibold text-slate-800">${invoiceBalance.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Save */}
        <div className="flex justify-end pb-8">
          <InvoiceSaveDropdown onSave={handleSave} disabled={!form.customer_id} saving={saving} />
        </div>
      </div>
    </div>
  );
}