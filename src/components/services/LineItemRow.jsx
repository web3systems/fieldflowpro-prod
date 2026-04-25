import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import AddServiceModal from "./AddServiceModal";

export default function LineItemRow({ item, idx, companyId, services = [], onServicesUpdate, onUpdate, onRemove }) {
  const [showAddModal, setShowAddModal] = useState(false);

  function handleCreated(svc) {
    if (onServicesUpdate) onServicesUpdate(svc);
    onUpdate(idx, null, {
      ...item,
      service_id: svc.id,
      description: svc.name,
      unit_price: svc.unit_price || 0,
      total: (item.quantity || 1) * (svc.unit_price || 0),
      notes: item.notes || "",
    });
    setShowAddModal(false);
  }

  function handleServiceSelect(value) {
    if (value === "__add_new__") {
      setShowAddModal(true);
      return;
    }
    if (value === "__custom__") {
      onUpdate(idx, null, { ...item, service_id: null, description: "" });
      return;
    }
    const svc = services.find(s => s.id === value);
    if (svc) {
      onUpdate(idx, null, {
        ...item,
        service_id: svc.id,
        description: svc.name,
        unit_price: svc.unit_price || 0,
        total: (item.quantity || 1) * (svc.unit_price || 0),
        notes: item.notes || "",
      });
    }
  }

  const selectValue = item.service_id ? item.service_id : "__custom__";
  // Support both 'category' (invoices/jobs) and '_category' (estimates) for material detection
  const isMaterialRow = item.category === "materials" || item._category === "Materials";

  // Group all services by item_type then category — mirrors the price book structure
  const { serviceGroups, materialGroups } = useMemo(() => {
    const svcItems = services.filter(s => s.item_type === "service" || !s.item_type);
    const matItems = services.filter(s => s.item_type === "material");

    function groupByCategory(items) {
      const map = {};
      items.forEach(s => {
        const cat = s.category || "Other";
        if (!map[cat]) map[cat] = [];
        map[cat].push(s);
      });
      return map;
    }

    return {
      serviceGroups: groupByCategory(svcItems),
      materialGroups: groupByCategory(matItems),
    };
  }, [services]);

  // For material rows show materials; for service rows show services
  const groupsToShow = isMaterialRow ? materialGroups : serviceGroups;

  return (
    <>
      {showAddModal && (
        <AddServiceModal
          companyId={companyId}
          onCreated={handleCreated}
          onClose={() => setShowAddModal(false)}
        />
      )}
      <div className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 rounded-lg">
        <div className="col-span-5 space-y-1">
          <Select value={selectValue} onValueChange={handleServiceSelect}>
            <SelectTrigger className="bg-white text-sm h-9">
              <SelectValue placeholder="Select from price book..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__add_new__" className="text-blue-600 font-medium">+ Add to Price Book</SelectItem>
              <SelectItem value="__custom__">-- Custom / Manual --</SelectItem>
              {/* Ensures the select always renders the current value even if service is no longer in list */}
              {item.service_id && !services.some(s => s.id === item.service_id) && (
                <SelectItem value={item.service_id} className="hidden">{item.description || item.service_id}</SelectItem>
              )}
              {Object.entries(groupsToShow).map(([cat, items]) => (
                <SelectGroup key={cat}>
                  <SelectLabel>{cat}</SelectLabel>
                  {items.map(svc => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.name}
                      {svc.unit_price > 0 ? ` — $${svc.unit_price.toFixed(2)}` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          {!item.service_id && (
            <Input
              value={item.description}
              onChange={e => onUpdate(idx, "description", e.target.value)}
              placeholder="Custom description..."
              className="bg-white text-sm"
            />
          )}
          <Input
            value={item.notes || ""}
            onChange={e => onUpdate(idx, "notes", e.target.value)}
            placeholder="Notes (optional)..."
            className="bg-white text-sm text-slate-500"
          />
        </div>
        <div className="col-span-2">
          <Input
            type="number"
            value={item.quantity}
            onChange={e => onUpdate(idx, "quantity", parseFloat(e.target.value) || 0)}
            placeholder="Qty"
            className="bg-white text-sm text-center"
          />
        </div>
        <div className="col-span-2">
          <Input
            type="number"
            value={item.unit_price}
            onChange={e => onUpdate(idx, "unit_price", parseFloat(e.target.value) || 0)}
            placeholder="Price"
            className="bg-white text-sm"
          />
        </div>
        <div className="col-span-2 text-right text-sm font-medium text-slate-700 pt-2">
          ${(item.total || 0).toFixed(2)}
        </div>
        <div className="col-span-1 flex justify-end pt-1">
          <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}