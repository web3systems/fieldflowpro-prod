import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import {
  Layers, Plus, Pencil, Trash2, Copy, X, Search, Save, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const PRIORITY_OPTS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const blank = (companyId) => ({
  name: "",
  description: "",
  category: "",
  service_type: "",
  default_priority: "medium",
  default_tax_rate: 0,
  estimated_labor_hours: 0,
  line_items: [],
  checklist: [],
  is_active: true,
  sort_order: 0,
});

export default function JobTemplates() {
  const { activeCompany, user } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);

  const canEdit = activeCompany && ["admin", "super_admin", "manager"].includes(user?.role);

  async function load() {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const list = await base44.entities.JobTemplate.filter({ company_id: activeCompany.id });
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name));
      setItems(list);
    } catch (e) {
      console.error("Template load error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [activeCompany?.id]);

  const filtered = items.filter((t) =>
    `${t.name} ${t.description || ""} ${t.category || ""} ${t.service_type || ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  async function handleDelete(t) {
    if (!confirm(`Delete template "${t.name}"? This will not affect existing jobs.`)) return;
    await base44.entities.JobTemplate.delete(t.id);
    setItems((prev) => prev.filter((i) => i.id !== t.id));
  }

  async function handleDuplicate(t) {
    const copy = { ...t };
    delete copy.id; delete copy.created_date; delete copy.updated_date; delete copy.created_by_id;
    copy.name = `${t.name} (Copy)`;
    copy.company_id = activeCompany.id;
    copy.is_active = true;
    const created = await base44.entities.JobTemplate.create(copy);
    setItems((prev) => [...prev, created]);
  }

  async function handleSave() {
    if (!editing?.name?.trim()) {
      alert("Template name is required.");
      return;
    }
    if (!activeCompany) return;

    const payload = {
      ...editing,
      company_id: activeCompany.id,
      line_items: (editing.line_items || []).map((i) => ({
        ...i,
        total: (i.total || 0) || ((parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0)),
      })),
    };

    try {
      if (editing.id) {
        const updated = await base44.entities.JobTemplate.update(editing.id, payload);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const created = await base44.entities.JobTemplate.create(payload);
        setItems((prev) => [...prev, created]);
      }
      setEditing(null);
    } catch (e) {
      alert(e?.message || "Failed to save template.");
    }
  }

  function updateLineItem(idx, field, value) {
    const items = [...(editing.line_items || [])];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      items[idx].total = (parseFloat(items[idx].quantity) || 0) * (parseFloat(items[idx].unit_price) || 0);
    }
    setEditing({ ...editing, line_items: items });
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-800 block leading-tight">Job Templates</span>
            <span className="text-xs text-slate-500">
              Reusable job types — line items, descriptions, and labor hours.
            </span>
          </div>
        </div>
        {canEdit && (
          <Button
            onClick={() => setEditing(blank(activeCompany?.id))}
            className="bg-blue-600 hover:bg-blue-700 gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Template
          </Button>
        )}
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates..."
            className="pl-8 h-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading templates…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">
              {items.length === 0 ? "No templates yet" : "No matches"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {items.length === 0 && canEdit
                ? "Create a template to prefill line items, descriptions, and labor hours for common jobs."
                : "Try a different search."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => {
              const itemTotal = (t.line_items || []).reduce((s, i) => s + (i.total || 0), 0);
              return (
                <div
                  key={t.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{t.name}</div>
                      {(t.service_type || t.category) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.service_type && (
                            <Badge variant="secondary" className="text-[10px]">{t.service_type}</Badge>
                          )}
                          {t.category && (
                            <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {t.is_active === false && (
                      <Badge className="bg-slate-200 text-slate-500 text-[10px]">Inactive</Badge>
                    )}
                  </div>

                  {t.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-slate-400">Items</div>
                      <div className="font-semibold text-slate-700">{(t.line_items || []).length}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> Hrs
                      </div>
                      <div className="font-semibold text-slate-700">{t.estimated_labor_hours || 0}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Total</div>
                      <div className="font-semibold text-slate-700">${itemTotal.toFixed(2)}</div>
                    </div>
                  </div>

                  {(t.line_items || []).length > 0 && (
                    <ul className="text-xs text-slate-500 space-y-0.5 border-t border-slate-100 pt-2">
                      {(t.line_items || []).slice(0, 4).map((li, idx) => (
                        <li key={idx} className="truncate flex items-center justify-between gap-2">
                          <span className="truncate">{li.description || "(no description)"}</span>
                          <span className="text-slate-400 flex-shrink-0">×{li.quantity || 1}</span>
                        </li>
                      ))}
                      {(t.line_items || []).length > 4 && (
                        <li className="text-slate-400">+ {(t.line_items || []).length - 4} more</li>
                      )}
                    </ul>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-slate-100 mt-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(t)}
                      className="gap-1 text-slate-600 h-8"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(t)}
                      className="gap-1 text-slate-600 h-8"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t)}
                      className="gap-1 text-slate-500 hover:text-red-600 ml-auto h-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2">
          <Link to="/NewJob" className="text-xs text-blue-600 hover:underline">
            ← Back to creating a job
          </Link>
        </div>
      </div>

      {/* Editor Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="w-4 h-4" /> {editing.id ? "Edit Template" : "New Template"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      placeholder="e.g. Lawn Maintenance Visit"
                      className="mt-1"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Input
                      value={editing.category || ""}
                      onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                      placeholder="e.g. Maintenance"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={editing.description || ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="What does this job type cover?"
                    rows={2}
                    className="mt-1 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Service Type</Label>
                    <Input
                      value={editing.service_type || ""}
                      onChange={(e) => setEditing({ ...editing, service_type: e.target.value })}
                      placeholder="e.g. HVAC"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Default Priority</Label>
                    <Select
                      value={editing.default_priority || "medium"}
                      onValueChange={(v) => setEditing({ ...editing, default_priority: v })}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Est. Labor Hours</Label>
                    <Input
                      type="number"
                      value={editing.estimated_labor_hours || 0}
                      onChange={(e) =>
                        setEditing({ ...editing, estimated_labor_hours: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Default Tax Rate (%)</Label>
                  <Input
                    type="number"
                    value={editing.default_tax_rate || 0}
                    onChange={(e) =>
                      setEditing({ ...editing, default_tax_rate: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 max-w-[200px]"
                  />
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Line Items</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          line_items: [
                            ...(editing.line_items || []),
                            { category: "service", description: "", quantity: 1, unit_price: 0, total: 0, labor_hours: 0 },
                          ],
                        })
                      }
                      className="gap-1.5 h-8"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Line
                    </Button>
                  </div>
                  {(editing.line_items || []).length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center border border-dashed rounded-md">
                      Add the line items that should auto-fill when this template is used.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wide text-slate-400 px-1">
                        <div className="col-span-4">Description</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2 text-right">Qty</div>
                        <div className="col-span-2 text-right">Price</div>
                        <div className="col-span-2 text-right">Hrs</div>
                      </div>
                      {(editing.line_items || []).map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <Input
                            value={item.description || ""}
                            onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                            placeholder="Description"
                            className="col-span-4 h-8 text-xs"
                          />
                          <Select
                            value={item.category || "service"}
                            onValueChange={(v) => updateLineItem(idx, "category", v)}
                          >
                            <SelectTrigger className="col-span-2 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="service">Service</SelectItem>
                              <SelectItem value="material">Material</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={item.quantity || 0}
                            onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                            placeholder="Qty"
                            className="col-span-2 h-8 text-xs text-right"
                          />
                          <Input
                            type="number"
                            value={item.unit_price || 0}
                            onChange={(e) => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                            className="col-span-2 h-8 text-xs text-right"
                          />
                          <div className="col-span-2 flex items-center gap-1">
                            <Input
                              type="number"
                              value={item.labor_hours || 0}
                              onChange={(e) => updateLineItem(idx, "labor_hours", parseFloat(e.target.value) || 0)}
                              placeholder="Hrs"
                              className="h-8 text-xs text-right"
                            />
                            <button
                              onClick={() =>
                                setEditing((prev) => ({
                                  ...prev,
                                  line_items: prev.line_items.filter((_, i) => i !== idx),
                                }))
                              }
                              className="text-slate-400 hover:text-red-500 flex-shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Default Checklist</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          checklist: [...(editing.checklist || []), { item: "", completed: false }],
                        })
                      }
                      className="gap-1.5 h-8"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </Button>
                  </div>
                  {(editing.checklist || []).length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center border border-dashed rounded-md">
                      Optional default checklist — tasks to be completed on every job of this type.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(editing.checklist || []).map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={c.item || ""}
                            onChange={(e) => {
                              const cl = [...(editing.checklist || [])];
                              cl[idx] = { ...cl[idx], item: e.target.value };
                              setEditing({ ...editing, checklist: cl });
                            }}
                            placeholder="Checklist item..."
                            className="h-8 text-xs flex-1"
                          />
                          <button
                            onClick={() =>
                              setEditing((prev) => ({
                                ...prev,
                                checklist: prev.checklist.filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="tpl-active"
                    checked={editing.is_active !== false}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  <label htmlFor="tpl-active" className="text-sm text-slate-600">
                    Active (available when creating jobs)
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
                  <Save className="w-4 h-4" /> Save Template
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}