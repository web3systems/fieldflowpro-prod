import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";

export default function PriceBookPicker({ companyId, itemType, onSelect, onClose }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});

  useEffect(() => {
    if (companyId) {
      base44.entities.Service.filter({ company_id: companyId, is_active: true }).then(all => {
        setItems(itemType === "service"
          ? all.filter(s => s.item_type === "service" || !s.item_type)
          : all.filter(s => s.item_type === "material")
        );
      });
    }
  }, [companyId, itemType]);

  const filtered = items.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.subcategory || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  // Build group → section → items tree from actual data
  const groups = [...new Set(filtered.map(s => s.category || "Other"))];

  function getSections(group) {
    return [...new Set(filtered.filter(s => (s.category || "Other") === group).map(s => s.subcategory || "General"))];
  }

  function getSectionItems(group, section) {
    return filtered.filter(s =>
      (s.category || "Other") === group &&
      (s.subcategory || "General") === section
    );
  }

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

  const toggleGroup = g => setCollapsedGroups(c => ({ ...c, [g]: !c[g] }));
  const toggleSection = k => setCollapsedSections(c => ({ ...c, [k]: !c[k] }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-semibold text-slate-900">
            {itemType === "service" ? "Service Price Book" : "Material Price Book"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-4 py-3 border-b flex-shrink-0">
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
          {groups.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">
              No {itemType === "service" ? "services" : "materials"} found.
              {!search && " Add items in the Price Book page."}
            </p>
          ) : (
            groups.map(group => {
              const isGroupCollapsed = collapsedGroups[group];
              const sections = getSections(group);

              return (
                <div key={group} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Group */}
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 transition-colors text-left"
                    onClick={() => toggleGroup(group)}
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-sm font-semibold text-white flex-1">{group}</span>
                    {isGroupCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  {!isGroupCollapsed && sections.map(section => {
                    const sectionKey = `${group}::${section}`;
                    const isSectionCollapsed = collapsedSections[sectionKey];
                    const sectionItems = getSectionItems(group, section);

                    return (
                      <div key={section}>
                        {/* Section */}
                        <button
                          className="w-full flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border-t border-slate-100 transition-colors text-left border-l-4 border-l-blue-400"
                          onClick={() => toggleSection(sectionKey)}
                        >
                          {isSectionCollapsed ? <ChevronRight className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                          <span className="text-xs font-semibold text-slate-600 flex-1">{section}</span>
                          <span className="text-xs text-slate-400">{sectionItems.length}</span>
                        </button>

                        {!isSectionCollapsed && sectionItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-blue-50 transition-colors text-left border-t border-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-slate-800 font-medium truncate">{item.name}</p>
                              {item.sku && <p className="text-xs text-slate-400 font-mono">#{item.sku}</p>}
                            </div>
                            <span className="text-sm font-semibold text-slate-700 flex-shrink-0 ml-3">${(item.unit_price || 0).toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}