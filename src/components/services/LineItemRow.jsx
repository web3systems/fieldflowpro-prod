import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import AddServiceModal from "./AddServiceModal";

export default function LineItemRow({ item, idx, companyId, services = [], onServicesUpdate, onUpdate, onRemove, categoryFilter }) {
  const [showAddModal, setShowAddModal] = useState(false);

  function handleCreated(svc) {
    if (onServicesUpdate) onServicesUpdate(svc);
    onUpdate(idx, "service_id", svc.id);
    onUpdate(idx, "description", svc.name);
    onUpdate(idx, "unit_price", svc.unit_price || 0);
    setShowAddModal(false);
  }

  function handleServiceSelect(value) {
    if (value === "__add_new__") {
      setShowAddModal(true);
      return;
    }
    if (value === "__custom__") {
      onUpdate(idx, "service_id", null);
      onUpdate(idx, "description", "");
      return;
    }
    const svc = services.find(s => s.id === value);
    if (svc) {
      onUpdate(idx, "service_id", svc.id);
      onUpdate(idx, "description", svc.name);
      onUpdate(idx, "unit_price", svc.unit_price || 0);
    }
  }

  // If item has a service_id but it's not in the services list, keep it as the selected value
  // This prevents snap-back when services are loading or changing
  const selectValue = item.service_id ? item.service_id : "__custom__";
  const isCustom = selectValue === "__custom__";

  const laborServices = services.filter(s => s.category === "Labor" || s.category === "labor");
  const materialServices = services.filter(s => s.category === "Materials" || s.category === "materials");
  const otherServices = services.filter(s => !["Labor", "labor", "Materials", "materials"].includes(s.category));

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
              <SelectItem value="__add_new__" className="text-blue-600 font-medium">+ Add New</SelectItem>
              <SelectItem value="__custom__">-- Custom --</SelectItem>
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
          {isCustom && (
            <Input
              value={item.description}
              onChange={e => onUpdate(idx, "description", e.target.value)}
              placeholder="Custom description..."
              className="bg-white text-sm"
            />
          )}
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