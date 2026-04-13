import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPlus, Search } from "lucide-react";

export default function ServicePicker({ companyId, onSelect }) {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      base44.entities.Service.filter({ company_id: companyId, is_active: true })
        .then(all => setServices(all.filter(s => s.item_type === 'service' || !s.item_type)));
    }
  }, [open, companyId]);

  const filtered = services.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map(s => s.category || "Other"))];

  function handleSelect(service) {
    onSelect({
      service_id: service.id,
      description: service.name,
      unit_price: service.unit_price || 0,
      quantity: 1,
      total: service.unit_price || 0,
    });
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Pick from services"
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <ListPlus className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search services..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">No active services found</p>
          ) : (
            categories.map(cat => (
              <div key={cat}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1">{cat}</p>
                {filtered.filter(s => (s.category || "Other") === cat).map(service => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleSelect(service)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-slate-700 truncate">{service.name}</span>
                    <span className="text-xs font-medium text-slate-500 flex-shrink-0">${(service.unit_price || 0).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}