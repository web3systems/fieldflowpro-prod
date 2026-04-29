import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { ArrowLeft, Plus, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ServicePicker from "@/components/services/ServicePicker";
import LineItemRow from "@/components/services/LineItemRow";

const STATUS_STYLES = {
  draft: "Draft", sent: "Sent", viewed: "Viewed",
  paid: "Paid", partial: "Partial", overdue: "Overdue", void: "Void",
};

const defaultItem = { service_id: null, description: "", quantity: 1, unit_price: 0, total: 0 };
const defaultForm = {
  customer_id: "", job_id: "", status: "draft",
  line_items: [{ ...defaultItem }], subtotal: 0, tax_rate: 0,
  tax_amount: 0, discount: 0, total: 0, amount_paid: 0,
  notes: "", due_date: "",
};

export default function NewInvoice() {
  const navigate = useNavigate();
  const { activeCompany } = useApp();
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
    const tax_amount = subtotal * ((tax_rate || 0) / 100);
    return { subtotal, tax_amount, total: subtotal + tax_amount - (discount || 0) };
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
    setForm({ ...form, line_items: items, ...calcTotals(items, form.tax_rate, form.discount) });
  }

  function addItem() {
    setForm({ ...form, line_items: [...form.line_items, { ...defaultItem }] });
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

  async function handleSave() {
    setSaving(true);
    const created = await base44.entities.Invoice.create({ ...form, company_id: activeCompany.id });
    setSaving(false);
    navigate(`/InvoiceDetail/${created.id}`);
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-800">New Invoice</span>
              {form.invoice_number && <span className="text-xs text-slate-400 font-mono ml-2">{form.invoice_number}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/Invoices")}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.customer_id} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">

        {/* Customer & Meta */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Invoice Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Customer *</Label>
              <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{getCustomerName(c.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_STYLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Labor */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Labor / Services</h3>
            <div className="flex items-center gap-2">
              <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} itemType="service" />
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add</Button>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1" />
          </div>
          <div className="space-y-2">
            {form.line_items.filter(item => !item.category || item.category === 'labor').map((item) => {
              const origIdx = form.line_items.indexOf(item);
              return (
                <LineItemRow key={origIdx} item={item} idx={origIdx} companyId={activeCompany?.id} services={services}
                  onServicesUpdate={svc => setServices(prev => [...prev, svc])} onUpdate={updateItem} onRemove={removeItem} />
              );
            })}
          </div>
        </div>

        {/* Materials */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Materials</h3>
            <div className="flex items-center gap-2">
              <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} itemType="material" />
              <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, line_items: [...f.line_items, { ...defaultItem, category: "materials" }] }))} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add</Button>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1" />
          </div>
          <div className="space-y-2">
            {form.line_items.filter(item => item.category === 'materials').map((item) => {
              const origIdx = form.line_items.indexOf(item);
              return (
                <LineItemRow key={origIdx} item={item} idx={origIdx} companyId={activeCompany?.id} services={services}
                  onServicesUpdate={svc => setServices(prev => [...prev, svc])} onUpdate={updateItem} onRemove={removeItem} />
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium">${(form.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 flex-1">Tax Rate (%)</span>
            <Input type="number" value={form.tax_rate} onChange={e => {
              const tax_rate = parseFloat(e.target.value) || 0;
              setForm({ ...form, tax_rate, ...calcTotals(form.line_items, tax_rate, form.discount) });
            }} className="w-20 h-7 text-sm bg-white" />
            <span className="text-sm text-slate-500">${(form.tax_amount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
            <span>Total</span>
            <span>${(form.total || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <Label className="text-sm font-semibold text-slate-700 mb-2 block">Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Notes for this invoice..." className="resize-none" />
        </div>

        {/* Bottom Save */}
        <div className="flex gap-3 pb-8">
          <Button variant="outline" onClick={() => navigate("/Invoices")} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.customer_id} className="flex-1 bg-blue-600 hover:bg-blue-700">
            {saving ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}