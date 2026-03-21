import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export default function LineItemRow({ item, idx, companyId, onUpdate, onRemove }) {
  const [services, setServices] = useState([]);

  useEffect(() => {
    if (!companyId) return;
    base44.entities.Service.filter({ company_id: companyId, is_active: true })
      .then(setServices)
      .catch(() => {});
  }, [companyId]);

  function handleServiceSelect(e) {
    const name = e.target.value;
    if (name === "__custom__") {
      onUpdate(idx, "description", "");
      return;
    }
    const svc = services.find(s => s.name === name);
    if (svc) {
      onUpdate(idx, "description", svc.name);
      onUpdate(idx, "unit_price", svc.unit_price || 0);
    }
  }

  const isMatchedService = services.some(s => s.name === item.description);

  return (
    <div className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg">
      <div className="col-span-5">
        {services.length > 0 ? (
          <select
            className="w-full border border-input rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-ring"
            value={isMatchedService ? item.description : "__custom__"}
            onChange={handleServiceSelect}
          >
            <option value="__custom__">-- Custom --</option>
            {["Labor", "Materials"].map(cat => {
              const catServices = services.filter(s => s.category === cat);
              if (catServices.length === 0) return null;
              return (
                <optgroup key={cat} label={cat}>
                  {catServices.map(svc => (
                    <option key={svc.id} value={svc.name}>{svc.name}</option>
                  ))}
                </optgroup>
              );
            })}
            {services.filter(s => !["Labor", "Materials"].includes(s.category)).length > 0 && (
              <optgroup label="Other">
                {services.filter(s => !["Labor", "Materials"].includes(s.category)).map(svc => (
                  <option key={svc.id} value={svc.name}>{svc.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        ) : (
          <Input
            value={item.description}
            onChange={e => onUpdate(idx, "description", e.target.value)}
            placeholder="Description"
            className="bg-white text-sm"
          />
        )}
        {/* If custom selected, show a text input for description */}
        {services.length > 0 && !isMatchedService && (
          <Input
            value={item.description}
            onChange={e => onUpdate(idx, "description", e.target.value)}
            placeholder="Custom description..."
            className="bg-white text-sm mt-1"
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
      <div className="col-span-2 text-right text-sm font-medium text-slate-700">
        ${(item.total || 0).toFixed(2)}
      </div>
      <div className="col-span-1 flex justify-end">
        <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}