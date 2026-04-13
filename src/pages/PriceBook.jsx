import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Search, Wrench, Package, ChevronDown, ChevronRight, FolderOpen, Wand2 } from "lucide-react";

// ── Default group/section trees ──────────────────────────────────────────────
const SERVICE_TREE = {
  "Labor": ["General Labor", "Skilled Labor", "Supervision"],
  "Installation": ["Flooring", "Cabinets & Millwork", "Doors & Windows", "Roofing", "Siding"],
  "Painting": ["Interior Painting", "Exterior Painting", "Staining & Finishing"],
  "Plumbing Services": ["Rough-In", "Finish Plumbing", "Drain & Sewer"],
  "Electrical Services": ["Rough-In Wiring", "Panel & Service", "Finish Electrical", "Low Voltage"],
  "HVAC Services": ["Ductwork", "Equipment Install", "Service & Repair"],
  "Cleaning": ["Post-Construction", "Pressure Washing", "Window Cleaning"],
  "Inspection & Consulting": ["Site Visit", "Estimate", "Code Compliance"],
  "Other": ["Miscellaneous"],
};

const MATERIAL_TREE = {
  "Lumber": ["Plywood & Sheathing", "Posts & Beams", "Dimensional Lumber (2x4, 2x6, etc.)", "Trim & Molding", "Engineered Wood"],
  "Concrete & Masonry": ["Concrete Mix", "Block & Brick", "Stucco & Mortar", "Rebar & Wire"],
  "Plumbing": ["PVC Pipe & Fittings", "Copper Pipe & Fittings", "PEX Tubing", "Valves & Controls", "Fixtures"],
  "Electrical": ["Wire & Cable", "Conduit", "Boxes & Devices", "Panels & Breakers", "Fixtures & Lighting"],
  "HVAC": ["Ductwork", "Insulation", "Vents & Registers", "Equipment"],
  "Roofing": ["Shingles", "Underlayment", "Flashing", "Gutters & Downspouts"],
  "Flooring": ["Hardwood", "Tile", "Laminate & LVP", "Carpet", "Subfloor"],
  "Drywall & Insulation": ["Drywall Sheets", "Joint Compound", "Tape & Beads", "Batt Insulation", "Rigid Foam"],
  "Doors & Windows": ["Interior Doors", "Exterior Doors", "Windows", "Hardware"],
  "Paint & Finishes": ["Interior Paint", "Exterior Paint", "Primer", "Stain & Sealer", "Caulk & Adhesive"],
  "Hardware & Fasteners": ["Nails & Screws", "Anchors & Bolts", "Straps & Connectors", "Hinges & Brackets"],
  "Landscaping": ["Soil & Mulch", "Pavers & Stone", "Plants & Sod", "Irrigation"],
  "Other": ["Miscellaneous"],
};

const unitLabels = {
  flat: "Flat Rate", hourly: "Per Hour", per_sqft: "Per Sq Ft",
  per_unit: "Per Unit", per_lb: "Per Lb", per_ft: "Per Ft", each: "Each"
};

function ItemFormModal({ editing, itemType, tree, companyId, onSave, onClose, prefillGroup, prefillSection }) {
  const [form, setForm] = useState(() => {
    const resolvedType = editing?.item_type || itemType;
    const activeTree = resolvedType === 'material' ? MATERIAL_TREE : SERVICE_TREE;
    const groups = Object.keys(activeTree);
    return editing
      ? { ...editing, unit_price: editing.unit_price ?? "" }
      : {
          item_type: itemType,
          name: "",
          description: "",
          category: prefillGroup || groups[0],
          subcategory: prefillSection || Object.values(activeTree)[0]?.[0] || "",
          unit_price: "",
          unit: itemType === "service" ? "hourly" : "each",
          sku: "",
          is_active: true,
          taxable: true,
        };
  });
  const [loading, setLoading] = useState(false);

  const activeTree = (form.item_type || itemType) === 'material' ? MATERIAL_TREE : SERVICE_TREE;
  const groups = Object.keys(activeTree);
  const sections = activeTree[form.category] || [];

  async function handleSave() {
    setLoading(true);
    const payload = { ...form, company_id: companyId, item_type: form.item_type || itemType, unit_price: parseFloat(form.unit_price) || 0 };
    if (editing) {
      await base44.entities.Service.update(editing.id, payload);
    } else {
      await base44.entities.Service.create(payload);
    }
    onSave();
    onClose();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold">{editing ? "Edit" : "Add"} {itemType === "service" ? "Service" : "Material"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          {editing && (
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, item_type: 'service', unit: 'hourly', category: 'Other', subcategory: 'Miscellaneous' }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.item_type === 'service' || !form.item_type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  🔧 Service / Labor
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, item_type: 'material', unit: 'each', category: 'Other', subcategory: 'Miscellaneous' }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.item_type === 'material'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  📦 Material
                </button>
              </div>
            </div>
          )}
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={itemType === "service" ? "e.g. Framing Labor" : "e.g. 2x4x8 Stud"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Group</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v, subcategory: activeTree[v]?.[0] || "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section</Label>
              <Select value={form.subcategory} onValueChange={v => setForm({ ...form, subcategory: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>SKU / Part # (optional)</Label>
            <Input value={form.sku || ""} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. LBR-2x4-8" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price ($)</Label>
              <Input type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(unitLabels).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={!!form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Taxable</Label>
            <Switch checked={!!form.taxable} onCheckedChange={v => setForm({ ...form, taxable: v })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !form.name} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {loading ? "Saving..." : editing ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceBookTab({ items, tree, itemType, companyId, onReload }) {
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [modal, setModal] = useState(null); // null | { editing, prefillGroup, prefillSection }

  const filtered = items.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.subcategory || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(item) {
    // Check if referenced in any line items
    const [jobs, estimates, invoices] = await Promise.all([
      base44.entities.Job.filter({ company_id: companyId }),
      base44.entities.Estimate.filter({ company_id: companyId }),
      base44.entities.Invoice.filter({ company_id: companyId }),
    ]);

    const isUsed = [...jobs, ...estimates, ...invoices].some(doc => {
      const lines = doc.line_items || (doc.options?.flatMap(o => o.line_items || []) ?? []);
      return lines.some(l => l.service_id === item.id);
    });

    if (isUsed) {
      const choice = confirm(
        `"${item.name}" is used in existing estimates, jobs, or invoices.\n\nClick OK to deactivate it (safe — preserves all existing documents).\nClick Cancel to keep it as-is.`
      );
      if (choice) {
        await base44.entities.Service.update(item.id, { is_active: false });
        onReload();
      }
      return;
    }

    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await base44.entities.Service.delete(item.id);
    onReload();
  }

  async function toggleActive(item) {
    await base44.entities.Service.update(item.id, { is_active: !item.is_active });
    onReload();
  }

  const toggleGroup = (g) => setCollapsedGroups(c => ({ ...c, [g]: !c[g] }));
  const toggleSection = (key) => setCollapsedSections(c => ({ ...c, [key]: !c[key] }));

  // Get items that belong to a group+section, plus catch items without subcategory
  function getItems(group, section) {
    return filtered.filter(s =>
      (s.category || Object.keys(tree)[0]) === group &&
      (s.subcategory === section || (!s.subcategory && section === Object.values(tree)[0]?.[0]))
    );
  }

  // Groups that have any matching items (or show all when no search)
  const visibleGroups = Object.keys(tree).filter(g =>
    !search || filtered.some(s => (s.category || Object.keys(tree)[0]) === g)
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={`Search ${itemType === "service" ? "services" : "materials"}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setModal({ editing: null })} className="gap-2 bg-blue-600 hover:bg-blue-700 flex-shrink-0">
          <Plus className="w-4 h-4" /> Add {itemType === "service" ? "Service" : "Material"}
        </Button>
      </div>

      <div className="space-y-3">
        {visibleGroups.map(group => {
          const groupCollapsed = collapsedGroups[group];
          const sections = tree[group] || [];
          const groupItemCount = filtered.filter(s => (s.category || Object.keys(tree)[0]) === group).length;

          return (
            <div key={group} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {/* Group header */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 transition-colors text-left"
                onClick={() => toggleGroup(group)}
              >
                <FolderOpen className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span className="font-semibold text-white flex-1">{group}</span>
                <Badge className="bg-slate-600 text-slate-200 text-xs">{groupItemCount} items</Badge>
                {groupCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {!groupCollapsed && (
                <div className="divide-y divide-slate-100">
                  {sections.map(section => {
                    const sectionKey = `${group}::${section}`;
                    const sectionCollapsed = collapsedSections[sectionKey];
                    const sectionItems = getItems(group, section);
                    if (search && sectionItems.length === 0) return null;

                    return (
                      <div key={section}>
                        {/* Section header */}
                        <button
                          className="w-full flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left border-l-4 border-l-blue-400"
                          onClick={() => toggleSection(sectionKey)}
                        >
                          {sectionCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="text-sm font-semibold text-slate-600 flex-1">{section}</span>
                          <span className="text-xs text-slate-400">{sectionItems.length} items</span>
                        </button>

                        {!sectionCollapsed && (
                          <div>
                            {sectionItems.length === 0 ? (
                              <p className="text-xs text-slate-400 italic px-6 py-2">No items yet.</p>
                            ) : (
                              sectionItems.map(item => (
                                <div key={item.id} className={`flex items-center gap-3 px-6 py-2.5 hover:bg-slate-50 transition-colors ${!item.is_active ? "opacity-50" : ""}`}>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-slate-800">{item.name}</span>
                                      {item.sku && <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">#{item.sku}</span>}
                                      {!item.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                                    </div>
                                    {item.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-semibold text-slate-900 text-sm">${(item.unit_price || 0).toFixed(2)}</p>
                                    <p className="text-xs text-slate-400">{unitLabels[item.unit] || item.unit}</p>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => toggleActive(item)}
                                      title={item.is_active ? "Deactivate" : "Activate"}
                                      className={`text-xs px-2 py-1 rounded border transition-colors ${item.is_active ? "border-green-200 text-green-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200" : "border-slate-200 text-slate-400 hover:bg-green-50 hover:text-green-600 hover:border-green-200"}`}
                                    >
                                      {item.is_active ? "Active" : "Inactive"}
                                    </button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ editing: item })}><Pencil className="w-3.5 h-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                  </div>
                                </div>
                              ))
                            )}
                            <div className="px-6 py-2 border-t border-slate-100">
                              <button
                                onClick={() => setModal({ editing: null, prefillGroup: group, prefillSection: section })}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Add to {section}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <ItemFormModal
          editing={modal.editing}
          itemType={itemType}
          tree={tree}
          companyId={companyId}
          prefillGroup={modal.prefillGroup}
          prefillSection={modal.prefillSection}
          onSave={onReload}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default function PriceBook() {
  const { activeCompany } = useApp();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (activeCompany?.id) loadAll();
  }, [activeCompany]);

  async function handleMigrate() {
    if (!confirm("This will use AI to auto-categorize any items that don't have a group/section yet. Continue?")) return;
    setMigrating(true);
    try {
      const res = await base44.functions.invoke('migratePriceBookItems', { company_id: activeCompany.id });
      alert(`Done! ${res.data?.migrated || 0} item(s) categorized.`);
      await loadAll();
    } catch (e) {
      alert('Migration failed: ' + e.message);
    }
    setMigrating(false);
  }

  async function loadAll() {
    setLoading(true);
    const data = await base44.entities.Service.filter({ company_id: activeCompany.id });
    setServices(data);
    setLoading(false);
  }

  const serviceItems = services.filter(s => s.item_type === "service" || !s.item_type);
  const materialItems = services.filter(s => s.item_type === "material");

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-7 h-7 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Price Book</h1>
          <p className="text-slate-500 text-sm mt-0.5">Services and materials catalog for {activeCompany?.name}</p>
        </div>
        <Button variant="outline" onClick={handleMigrate} disabled={migrating} className="gap-2 flex-shrink-0">
          <Wand2 className="w-4 h-4" />
          {migrating ? "Categorizing..." : "Auto-Categorize Items"}
        </Button>
      </div>

      <Tabs defaultValue="materials">
        <TabsList className="mb-6">
          <TabsTrigger value="services" className="gap-2">
            <Wrench className="w-4 h-4" /> Services
            <Badge variant="secondary" className="ml-1">{serviceItems.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Package className="w-4 h-4" /> Materials
            <Badge variant="secondary" className="ml-1">{materialItems.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <PriceBookTab items={serviceItems} tree={SERVICE_TREE} itemType="service" companyId={activeCompany?.id} onReload={loadAll} />
        </TabsContent>
        <TabsContent value="materials">
          <PriceBookTab items={materialItems} tree={MATERIAL_TREE} itemType="material" companyId={activeCompany?.id} onReload={loadAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}