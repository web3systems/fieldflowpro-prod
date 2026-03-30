import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, ChevronDown, ChevronUp, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyItem = { description: "", quantity: 1, unit_price: 0, total: 0, category: "service" };

export default function JobLineItemsSection({ form, setForm, companyId, onSave }) {
  const [services, setServices] = useState([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (companyId) {
      base44.entities.Service.filter({ company_id: companyId, is_active: true }).then(setServices).catch(() => {});
    }
  }, [companyId]);

  const lineItems = form.line_items || [];
  // Build indexed lists to avoid fragile indexOf lookups
  const serviceItems = lineItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category !== "material");
  const materialItems = lineItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category === "material");

  const laborServices = useMemo(() => services.filter(s => s.category === "Labor" || s.category === "labor"), [services]);
  const materialServices = useMemo(() => services.filter(s => s.category === "Materials" || s.category === "materials"), [services]);
  const otherServices = useMemo(() => services.filter(s => !["Labor","labor","Materials","materials"].includes(s.category)), [services]);

  function updateItem(index, field, value) {
    const items = [...lineItems];
    items[index] = { ...items[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
    }
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    setForm(f => ({ ...f, line_items: items, total_amount: subtotal }));
  }

  function handleServiceSelect(index, serviceId) {
    if (serviceId === "__custom__") {
      updateItem(index, "service_id", null);
      return;
    }
    const svc = services.find(s => s.id === serviceId);
    if (svc) {
      const items = [...lineItems];
      const qty = items[index].quantity || 1;
      items[index] = {
        ...items[index],
        service_id: svc.id,
        description: svc.name,
        unit_price: svc.unit_price || 0,
        total: qty * (svc.unit_price || 0),
      };
      const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
      setForm(f => ({ ...f, line_items: items, total_amount: subtotal }));
    }
  }

  function addItem(category) {
    const items = [...lineItems, { ...emptyItem, category }];
    setForm(f => ({ ...f, line_items: items }));
  }

  function removeItem(index) {
    const items = lineItems.filter((_, i) => i !== index);
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    setForm(f => ({ ...f, line_items: items, total_amount: subtotal }));
  }

  const subtotal = lineItems.reduce((s, i) => s + (i.total || 0), 0);
  const taxRate = form.tax_rate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - (form.discount || 0);

  function renderItem(item, index) {
    const globalIndex = index;
    return (
      <div key={globalIndex} className="border-b border-slate-100 last:border-0">
        <div className="px-5 py-3 grid grid-cols-12 gap-2 items-center">
          <div className="col-span-1 text-slate-300 text-center">≡</div>
          <div className="col-span-5">
            <Select value={item.service_id || "__custom__"} onValueChange={v => handleServiceSelect(globalIndex, v)}>
              <SelectTrigger className="h-8 text-sm bg-white">
                <SelectValue placeholder="Select service..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">-- Custom --</SelectItem>
                {laborServices.length > 0 && (
                  <SelectGroup><SelectLabel>Labor</SelectLabel>
                    {laborServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectGroup>
                )}
                {materialServices.length > 0 && (
                  <SelectGroup><SelectLabel>Materials</SelectLabel>
                    {materialServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectGroup>
                )}
                {otherServices.length > 0 && (
                  <SelectGroup><SelectLabel>Other</SelectLabel>
                    {otherServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {!item.service_id && (
              <Input
                value={item.description}
                onChange={e => updateItem(globalIndex, "description", e.target.value)}
                placeholder="Description..."
                className="h-7 text-xs mt-1"
              />
            )}
          </div>
          <div className="col-span-2">
            <Input type="number" value={item.quantity} onChange={e => updateItem(globalIndex, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qty" className="h-8 text-sm text-center" />
          </div>
          <div className="col-span-2">
            <Input type="number" value={item.unit_price} onChange={e => updateItem(globalIndex, "unit_price", parseFloat(e.target.value) || 0)} placeholder="Price" className="h-8 text-sm" />
          </div>
          <div className="col-span-1 text-sm font-medium text-slate-700 text-right">
            ${(item.total || 0).toFixed(2)}
          </div>
          <div className="col-span-1 flex justify-end">
            <button onClick={() => removeItem(globalIndex)} className="text-slate-300 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(!expanded)}>
        <h3 className="font-semibold text-slate-800">Line items</h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <div className="col-span-1"></div>
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Unit price</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Services */}
          <div className="px-5 pt-3 pb-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Services</p>
          </div>
          {serviceItems.map(({ item, idx }) => renderItem(item, idx))}
          <div className="px-5 py-2 border-b border-slate-100">
            <button onClick={() => addItem("service")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
              <Plus className="w-3.5 h-3.5" /> Add service
            </button>
          </div>

          {/* Materials */}
          <div className="px-5 pt-3 pb-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Materials</p>
          </div>
          {materialItems.map(({ item, idx }) => renderItem(item, idx))}
          <div className="px-5 py-2 border-b border-slate-200">
            <button onClick={() => addItem("material")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
              <Plus className="w-3.5 h-3.5" /> Add material
            </button>
          </div>

          {/* Totals */}
          <div className="px-5 py-3 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500 items-center gap-2">
              <span className="flex items-center gap-2">
                Tax rate
                <Input
                  type="number"
                  value={form.tax_rate || 0}
                  onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))}
                  className="h-6 w-16 text-xs"
                  placeholder="%"
                />
                <span className="text-xs text-slate-400">%</span>
              </span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            {(form.discount > 0) && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Discount</span>
                <span>-${(form.discount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="px-5 pb-4">
            <Button size="sm" onClick={onSave} className="gap-1 bg-blue-600 hover:bg-blue-700 text-xs">
              <Check className="w-3 h-3" /> Save Line Items
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}