import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ListPlus, Search } from "lucide-react";

export default function ServicePicker({ companyId, onSelect, itemType }) {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      base44.entities.Service.filter({ company_id: companyId, is_active: true })
        .then(all => setServices(all));
    }
  }, [open, companyId]);

  // Filter by itemType if provided, otherwise show all
  const relevant = useMemo(() => {
    let items = services;
    if (itemType === "service") items = services.filter(s => s.item_type === "service" || !s.item_type);
    else if (itemType === "material") items = services.filter(s => s.item_type === "material");
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.category || "").toLowerCase().includes(q) ||
      (s.subcategory || "").toLowerCase().includes(q) ||
      (s.sku || "").toLowerCase().includes(q)
    );
  }, [services, itemType, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = {};
    relevant.forEach(s => {
      const cat = s.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    });
    return map;
  }, [relevant]);

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
          title="Pick from price book"
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <ListPlus className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search price book..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {relevant.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">No items found</p>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1">{cat}</p>
                {items.map(service => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleSelect(service)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">{service.name}</p>
                      {service.subcategory && <p className="text-xs text-slate-400 truncate">{service.subcategory}</p>}
                    </div>
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