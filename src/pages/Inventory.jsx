import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { useModules } from "@/hooks/useModules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Boxes, Plus, Search, AlertTriangle, Package, Wrench, Laptop, Edit, Trash2, Loader2, ArrowUp, ArrowDown
} from "lucide-react";
import { toast } from "sonner";

const ITEM_TYPES = [
  { value: "internal", label: "Internal", icon: Wrench, description: "Tools, equipment, vehicles" },
  { value: "customer", label: "Customer", icon: Package, description: "Loaners, rentals" },
  { value: "digital", label: "Digital", icon: Laptop, description: "Software licenses, subscriptions" },
];

const STATUS_COLORS = {
  available: "bg-green-100 text-green-700",
  in_use: "bg-blue-100 text-blue-700",
  maintenance: "bg-yellow-100 text-yellow-700",
  retired: "bg-slate-100 text-slate-500",
};

export default function Inventory() {
  const { activeCompany } = useApp();
  const { hasModule, loading: moduleLoading } = useModules(activeCompany?.id);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  function defaultForm() {
    return {
      name: "", item_type: "internal", category: "", sku: "",
      quantity: 1, quantity_min: 1, status: "available",
      assigned_to: "", notes: "", unit_cost: ""
    };
  }

  useEffect(() => {
    if (activeCompany?.id) loadItems();
  }, [activeCompany?.id]);

  async function loadItems() {
    setLoading(true);
    const data = await base44.entities.InventoryItem.filter({ company_id: activeCompany.id });
    setItems(data);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm(defaultForm());
    setShowForm(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || "",
      item_type: item.item_type || "internal",
      category: item.category || "",
      sku: item.sku || "",
      quantity: item.quantity ?? 1,
      quantity_min: item.quantity_min ?? 1,
      status: item.status || "available",
      assigned_to: item.assigned_to || "",
      notes: item.notes || "",
      unit_cost: item.unit_cost ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const payload = { ...form, company_id: activeCompany.id, quantity: Number(form.quantity), quantity_min: Number(form.quantity_min), unit_cost: form.unit_cost !== "" ? Number(form.unit_cost) : null };
    if (editing) {
      await base44.entities.InventoryItem.update(editing.id, payload);
      toast.success("Item updated");
    } else {
      await base44.entities.InventoryItem.create(payload);
      toast.success("Item added");
    }
    setSaving(false);
    setShowForm(false);
    loadItems();
  }

  async function handleDelete(item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await base44.entities.InventoryItem.delete(item.id);
    toast.success("Item deleted");
    loadItems();
  }

  const filtered = items.filter(item => {
    const matchesTab = tab === "all" || item.item_type === tab;
    const matchesSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  }).sort((a, b) => {
    if (!sortField) return 0;
    let va = a[sortField], vb = b[sortField];
    if (va == null) va = ""; if (vb == null) vb = "";
    if (sortField === "quantity" || sortField === "unit_cost") { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
    if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const lowStock = items.filter(i => i.quantity != null && i.quantity_min != null && i.quantity <= i.quantity_min);

  if (moduleLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  if (!hasModule("inventory_management")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center p-6">
        <Boxes className="w-12 h-12 text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-700">Inventory Management</h2>
        <p className="text-slate-500 text-sm max-w-sm">This module is not active for your company. Enable it from the Marketplace.</p>
        <Button onClick={() => window.location.href = "/Marketplace"}>Go to Marketplace</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
            <p className="text-slate-500 text-sm">{items.length} items tracked</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <span><strong>{lowStock.length}</strong> item{lowStock.length !== 1 ? "s" : ""} at or below minimum stock: {lowStock.map(i => i.name).join(", ")}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search items..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <select
          value={sortField}
          onChange={e => setSortField(e.target.value)}
          className="h-9 text-xs bg-white border border-slate-200 rounded-lg px-2.5 text-slate-600 flex-1 sm:w-auto sm:flex-none"
        >
          <option value="">Sort by...</option>
          <option value="name">Name</option>
          <option value="quantity">Quantity</option>
          <option value="unit_cost">Cost</option>
          <option value="status">Status</option>
          <option value="category">Category</option>
        </select>
        {sortField && (
          <button
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex-shrink-0"
          >
            {sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          {ITEM_TYPES.map(t => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label} ({items.filter(i => i.item_type === t.value).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Boxes className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(item => {
                const TypeIcon = ITEM_TYPES.find(t => t.value === item.item_type)?.icon || Package;
                const isLow = item.quantity != null && item.quantity_min != null && item.quantity <= item.quantity_min;
                return (
                  <Card key={item.id} className={`hover:shadow-md transition-all ${isLow ? "border-yellow-300" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <TypeIcon className="w-4 h-4 text-slate-600" />
                          </div>
                          <CardTitle className="text-sm font-semibold text-slate-900 truncate">{item.name}</CardTitle>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(item)} className="p-1 text-slate-400 hover:text-slate-700 rounded">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className={STATUS_COLORS[item.status] || "bg-slate-100 text-slate-600"} variant="outline">
                          {item.status || "available"}
                        </Badge>
                        {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                        {isLow && <Badge className="bg-yellow-100 text-yellow-700" variant="outline">Low Stock</Badge>}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Qty: <strong className="text-slate-700">{item.quantity ?? "—"}</strong></span>
                        {item.unit_cost != null && <span>Cost: <strong className="text-slate-700">${item.unit_cost}</strong></span>}
                        {item.sku && <span>SKU: {item.sku}</span>}
                      </div>
                      {item.assigned_to && (
                        <p className="text-xs text-slate-500">Assigned: {item.assigned_to}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Pressure Washer" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                <Select value={form.item_type} onValueChange={v => setForm(f => ({...f, item_type: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Category</label>
                <Input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="e.g. Equipment" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">SKU / Part #</label>
                <Input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Quantity</label>
                <Input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Min Stock Alert</label>
                <Input type="number" min="0" value={form.quantity_min} onChange={e => setForm(f => ({...f, quantity_min: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Unit Cost ($)</label>
                <Input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({...f, unit_cost: e.target.value}))} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Assigned To</label>
                <Input value={form.assigned_to} onChange={e => setForm(f => ({...f, assigned_to: e.target.value}))} placeholder="Technician name" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
                <Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Optional notes" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}