import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

export default function LineItemRow({ item, idx, companyId, onUpdate, onRemove, categoryFilter }) {
  const [services, setServices] = useState([]);

  useEffect(() => {
    if (!companyId) return;
    base44.entities.Service.filter({ company_id: companyId, is_active: true })
      .then(setServices)
      .catch(() => {});
  }, [companyId]);

  function handleServiceSelect(value) {
    if (value === "__custom__") {
      onUpdate(idx, "description", "");
      return;
    }
    const svc = services.find(s => s.id === value);
    if (svc) {
      onUpdate(idx, "description", svc.name);
      onUpdate(idx, "unit_price", svc.unit_price || 0);
    }
  }

  const matchedService = services.find(s => s.name === item.description);
  const selectValue = matchedService ? matchedService.id : "__custom__";

  const filteredServices = categoryFilter ? services.filter(s => s.category === categoryFilter) : services;
  const laborServices = categoryFilter ? filteredServices : services.filter(s => s.category === "Labor");
  const materialServices = categoryFilter ? [] : services.filter(s => s.category === "Materials");
  const otherServices = categoryFilter ? [] : services.filter(s => !["Labor", "Materials"].includes(s.category));

  return (
    <div className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 rounded-lg">
      <div className="col-span-5 space-y-1">
        <Select value={selectValue} onValueChange={handleServiceSelect}>
          <SelectTrigger className="bg-white text-sm h-9">
            <SelectValue placeholder="Select a service..." />
          </SelectTrigger>
          <SelectContent>
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
        {/* Show text input for custom description */}
        {!matchedService && (
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
  );
}