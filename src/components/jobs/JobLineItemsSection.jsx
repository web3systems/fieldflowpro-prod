import { useState, useEffect, useMemo } from "react";
import PriceBookPicker from "@/components/services/PriceBookPicker";
import { base44 } from "@/api/base44Client";
import { Plus, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LineItemRow from "@/components/services/LineItemRow";

const emptyItem = { description: "", quantity: 1, unit_price: 0, total: 0, category: "service" };

export default function JobLineItemsSection({ form, setForm, companyId, onSave }) {
  const [services, setServices] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [pickerType, setPickerType] = useState(null); // "service" | "material"

  useEffect(() => {
    if (companyId) {
      base44.entities.Service.filter({ company_id: companyId, is_active: true }).then(setServices).catch(() => {});
    }
  }, [companyId]);

  const lineItems = form.line_items || [];
  const serviceItems = lineItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category !== "material");
  const materialItems = lineItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category === "material");

  function updateItem(index, field, valueOrFullItem) {
    const items = [...lineItems];
    if (field === null && typeof valueOrFullItem === "object") {
      // Full item replacement (from LineItemRow)
      items[index] = valueOrFullItem;
    } else {
      items[index] = { ...items[index], [field]: valueOrFullItem };
      if (field === "quantity" || field === "unit_price") {
        items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
      }
    }
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    setForm(f => ({ ...f, line_items: items, total_amount: subtotal }));
  }

  function addItem(category) {
    setForm(f => ({ ...f, line_items: [...(f.line_items || []), { ...emptyItem, category }] }));
  }

  function removeItem(index) {
    const items = lineItems.filter((_, i) => i !== index);
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    setForm(f => ({ ...f, line_items: items, total_amount: subtotal }));
  }

  function handleServicesUpdate(newSvc) {
    setServices(prev => [...prev, newSvc]);
  }

  const subtotal = lineItems.reduce((s, i) => s + (i.total || 0), 0);
  const taxRate = form.tax_rate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - (form.discount || 0);

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
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Unit price</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Services */}
          <div className="px-5 pt-3 pb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Services</p>
            <button onClick={() => setPickerType("service")} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Service Price Book</button>
          </div>
          <div className="px-5 space-y-2 pb-2">
            {serviceItems.map(({ item, idx }) => (
              <LineItemRow
                key={idx}
                item={item}
                idx={idx}
                companyId={companyId}
                services={services}
                onServicesUpdate={handleServicesUpdate}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>
          <div className="px-5 py-2 border-b border-slate-100">
            <button onClick={() => addItem("service")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
              <Plus className="w-3.5 h-3.5" /> Add service
            </button>
          </div>

          {/* Materials */}
          <div className="px-5 pt-3 pb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Materials</p>
            <button onClick={() => setPickerType("material")} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Material Price Book</button>
          </div>
          <div className="px-5 space-y-2 pb-2">
            {materialItems.map(({ item, idx }) => (
              <LineItemRow
                key={idx}
                item={item}
                idx={idx}
                companyId={companyId}
                services={services}
                onServicesUpdate={handleServicesUpdate}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>
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

      {pickerType && (
        <PriceBookPicker
          companyId={companyId}
          itemType={pickerType}
          onSelect={item => {
            addItem(pickerType);
            // Replace last item with the picked one
            setForm(f => {
              const items = [...(f.line_items || [])];
              items[items.length - 1] = { ...item, category: pickerType };
              const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
              return { ...f, line_items: items, total_amount: subtotal };
            });
          }}
          onClose={() => setPickerType(null)}
        />
      )}
    </div>
  );
}