import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";

export default function PriceBookPicker({ companyId, itemType, onSelect, onClose }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    if (companyId) {
      base44.entities.Service.filter({ company_id: companyId, is_active: true }).then(all => {
        if (itemType === "service") {
          setItems(all.filter(s => s.item_type === "service" || !s.item_type));
        } else {
          setItems(all.filter(s => s.item_type === "material"));
        }
      });
    }
  }, [companyId, itemType]);

  const filtered = items.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map(s => s.category || "Other"))];

  function handleSelect(item) {
    onSelect({
      service_id: item.id,
      description: item.name,
      unit_price: item.unit_price || 0,
      quantity: 1,
      total: item.unit_price || 0,
      category: itemType,
    });
    onClose();
  }

  function toggleCollapse(cat) {
    setCollapsed(c => ({ ...c, [cat]: !c[cat] }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-900">
            {itemType === "service" ? "Service Price Book" : "Material Price Book"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${itemType === "service" ? "services" : "materials"}...`}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {categories.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">
              No {itemType === "service" ? "services" : "materials"} found.
              {!search && " Add some in the Price Book page."}
            </p>
          ) : (
            categories.map(cat => {
              const catItems = filtered.filter(s => (s.category || "Other") === cat);
              const isCollapsed = collapsed[cat];
              return (
                <div key={cat} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    onClick={() => toggleCollapse(cat)}
                  >
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="text-sm font-semibold text-slate-600">{cat}</span>
                    <span className="text-xs text-slate-400 ml-auto">{catItems.length} items</span>
                  </button>
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {catItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-slate-800 font-medium truncate">{item.name}</p>
                            {item.sku && <p className="text-xs text-slate-400 font-mono">#{item.sku}</p>}
                          </div>
                          <span className="text-sm font-semibold text-slate-700 flex-shrink-0 ml-3">${(item.unit_price || 0).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}