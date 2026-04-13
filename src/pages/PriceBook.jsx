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
import { Plus, Pencil, Trash2, Search, Wrench, Package, ChevronDown, ChevronRight } from "lucide-react";

const SERVICE_CATEGORIES = ["Labor", "Installation", "Maintenance", "Inspection & Consulting", "Cleaning", "Landscaping", "Painting", "Other"];
const MATERIAL_CATEGORIES = ["Lumber & Wood", "Plumbing", "Electrical", "HVAC", "Flooring", "Paint & Supplies", "Hardware", "Roofing", "Concrete & Masonry", "Fasteners", "Other"];

const unitLabels = { flat: "Flat Rate", hourly: "Per Hour", per_sqft: "Per Sq Ft", per_unit: "Per Unit", per_lb: "Per Lb", per_ft: "Per Ft", each: "Each" };

const defaultServiceForm = { item_type: "service", name: "", description: "", category: "Labor", unit_price: "", unit: "hourly", sku: "", is_active: true, taxable: true };
const defaultMaterialForm = { item_type: "material", name: "", description: "", category: "Lumber & Wood", unit_price: "", unit: "each", sku: "", is_active: true, taxable: true };

function PriceBookTab({ items, categories, itemType, companyId, onReload }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(itemType === "service" ? defaultServiceForm : defaultMaterialForm);
  const [loading, setLoading] = useState(false);

  const filtered = items.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  function openNew() {
    setEditing(null);
    setForm(itemType === "service" ? defaultServiceForm : defaultMaterialForm);
    setSheetOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ ...item, unit_price: item.unit_price ?? "" });
    setSheetOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const payload = { ...form, company_id: companyId, item_type: itemType, unit_price: parseFloat(form.unit_price) || 0 };
    if (editing) {
      await base44.entities.Service.update(editing.id, payload);
    } else {
      await base44.entities.Service.create(payload);
    }
    onReload();
    setSheetOpen(false);
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    await base44.entities.Service.delete(id);
    onReload();
  }

  async function toggleActive(item) {
    await base44.entities.Service.update(item.id, { is_active: !item.is_active });
    onReload();
  }

  function toggleCollapse(cat) {
    setCollapsed(c => ({ ...c, [cat]: !c[cat] }));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder={`Search ${itemType === "service" ? "services" : "materials"}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add {itemType === "service" ? "Service" : "Material"}
        </Button>
      </div>

      {categories.map(cat => {
        const catItems = filtered.filter(s => (s.category || (itemType === "service" ? "Labor" : "Other")) === cat);
        if (catItems.length === 0 && search) return null;
        const isCollapsed = collapsed[cat];

        return (
          <div key={cat} className="mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              onClick={() => toggleCollapse(cat)}
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                <span className="font-semibold text-slate-700 text-sm">{cat}</span>
                <Badge variant="secondary" className="text-xs">{catItems.length}</Badge>
              </div>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-slate-100">
                {catItems.length === 0 ? (
                  <p className="text-sm text-slate-400 px-4 py-3 italic">No items in this group yet.</p>
                ) : (
                  catItems.map(item => (
                    <div key={item.id} className={`flex items-center gap-4 px-4 py-3 ${!item.is_active ? "opacity-50" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 text-sm">{item.name}</span>
                          {item.sku && <span className="text-xs text-slate-400 font-mono">#{item.sku}</span>}
                          {!item.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </div>
                        {item.description && <p className="text-slate-400 text-xs mt-0.5 truncate">{item.description}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-slate-900">${(item.unit_price || 0).toFixed(2)}</p>
                        <p className="text-xs text-slate-400">{unitLabels[item.unit] || item.unit}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleActive(item)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${item.is_active ? "border-green-200 text-green-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200" : "border-slate-200 text-slate-400 hover:bg-green-50 hover:text-green-600"}`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  ))
                )}
                <div className="px-4 py-2">
                  <button onClick={() => { setEditing(null); setForm({...(itemType === "service" ? defaultServiceForm : defaultMaterialForm), category: cat}); setSheetOpen(true); }} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add to {cat}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold">{editing ? "Edit" : "New"} {itemType === "service" ? "Service" : "Material"}</h2>
              <button onClick={() => setSheetOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={itemType === "service" ? "e.g. Hourly Labor" : "e.g. 2x4x8 Lumber"} />
              </div>
              <div>
                <Label>Group / Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(itemType === "service" ? SERVICE_CATEGORIES : MATERIAL_CATEGORIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} disabled={loading || !form.name} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {loading ? "Saving..." : editing ? "Save Changes" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PriceBook() {
  const { activeCompany } = useApp();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany?.id) loadAll();
  }, [activeCompany]);

  async function loadAll() {
    setLoading(true);
    const data = await base44.entities.Service.filter({ company_id: activeCompany.id });
    setServices(data);
    setLoading(false);
  }

  const serviceItems = services.filter(s => s.item_type === "service" || !s.item_type);
  const materialItems = services.filter(s => s.item_type === "material");

  if (loading) return <div className="p-8 flex justify-center"><div className="w-7 h-7 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Price Book</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your services and materials catalog for {activeCompany?.name}</p>
      </div>

      <Tabs defaultValue="services">
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
          <PriceBookTab
            items={serviceItems}
            categories={SERVICE_CATEGORIES}
            itemType="service"
            companyId={activeCompany?.id}
            onReload={loadAll}
          />
        </TabsContent>

        <TabsContent value="materials">
          <PriceBookTab
            items={materialItems}
            categories={MATERIAL_CATEGORIES}
            itemType="material"
            companyId={activeCompany?.id}
            onReload={loadAll}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}