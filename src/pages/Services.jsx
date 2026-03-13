import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import StandardServicesCatalog from "@/components/services/StandardServicesCatalog";

const defaultForm = {
  name: "",
  description: "",
  category: "",
  unit_price: "",
  unit: "flat",
  is_active: true,
  taxable: true,
};

const unitLabels = { flat: "Flat Rate", hourly: "Per Hour", per_sqft: "Per Sq Ft", per_unit: "Per Unit" };

export default function Services() {
  const { activeCompany } = useApp();
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeCompany?.id) loadServices();
  }, [activeCompany]);

  async function loadServices() {
    const data = await base44.entities.Service.filter({ company_id: activeCompany.id });
    setServices(data);
  }

  function openNew() {
    setEditing(null);
    setForm(defaultForm);
    setSheetOpen(true);
  }

  function openEdit(svc) {
    setEditing(svc);
    setForm({ ...svc, unit_price: svc.unit_price ?? "" });
    setSheetOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const payload = { ...form, company_id: activeCompany.id, unit_price: parseFloat(form.unit_price) || 0 };
    if (editing) {
      await base44.entities.Service.update(editing.id, payload);
    } else {
      await base44.entities.Service.create(payload);
    }
    await loadServices();
    setSheetOpen(false);
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this service?")) return;
    await base44.entities.Service.delete(id);
    await loadServices();
  }

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your service catalog for {activeCompany?.name}</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Add Service
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search services..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            No services found. Add your first service to get started.
          </div>
        )}
        {filtered.map(svc => (
          <div key={svc.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{svc.name}</span>
                {!svc.is_active && <Badge variant="secondary">Inactive</Badge>}
                {svc.category && <Badge variant="outline" className="text-xs">{svc.category}</Badge>}
              </div>
              {svc.description && <p className="text-slate-500 text-sm mt-0.5 truncate">{svc.description}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-slate-900">${(svc.unit_price || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-400">{unitLabels[svc.unit] || svc.unit}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(svc)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(svc.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Service" : "New Service"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Lawn Mowing" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Landscaping" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
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
                    {Object.entries(unitLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Taxable</Label>
              <Switch checked={form.taxable} onCheckedChange={v => setForm({ ...form, taxable: v })} />
            </div>
            <Button onClick={handleSave} disabled={loading || !form.name} className="w-full mt-2">
              {loading ? "Saving..." : editing ? "Save Changes" : "Create Service"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}