import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import AddServiceModal from "./AddServiceModal";

export default function LineItemRow({ item, idx, companyId, services = [], onServicesUpdate, onUpdate, onRemove }) {
  const [showAddModal, setShowAddModal] = useState(false);

  function handleCreated(svc) {
    if (onServicesUpdate) onServicesUpdate(svc);
    // Update all fields at once to avoid stale state issues
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

  const serviceExists = item.service_id && services.some(s => s.id === item.service_id);
  // If service_id is set but not in the list yet (services still loading), keep showing the id
  // so the select doesn't flash to __custom__ while services load
  const selectValue = item.service_id ? item.service_id : "__custom__";

  const laborServices = useMemo(() => services.filter(s => s.category === "Labor" || s.category === "labor"), [services]);
  const materialServices = useMemo(() => services.filter(s => s.category === "Materials" || s.category === "materials"), [services]);
  const otherServices = useMemo(() => services.filter(s => !["Labor", "labor", "Materials", "materials"].includes(s.category)), [services]);

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
              <SelectValue placeholder="Select a service..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__add_new__" className="text-blue-600 font-medium">+ Add New Service</SelectItem>
              <SelectItem value="__custom__">-- Custom --</SelectItem>
              {/* Hidden option keeps the select valid when service_id is set but not yet in the list */}
              {item.service_id && !serviceExists && (
                <SelectItem value={item.service_id} className="hidden">{item.description || item.service_id}</SelectItem>
              )}
              {laborServices.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Labor</SelectLabel>
                  {laborServices.map(svc => (
                    <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
                  ))}
                </SelectGroup>
              )}
              {materialServices.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Materials</SelectLabel>
                  {materialServices.map(svc => (
                    <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
                  ))}
                </SelectGroup>
              )}
              {otherServices.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Other</SelectLabel>
                  {otherServices.map(svc => (
                    <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          {(!item.service_id || !serviceExists) && (
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