import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ALL_WIDGETS, WidgetRenderer } from "./ReportWidgets";
import { Plus, Trash2, Edit2, LayoutDashboard, X } from "lucide-react";

export default function CustomDashboardBuilder({ companyId, data }) {
  const [dashboards, setDashboards] = useState([]);
  const [activeDash, setActiveDash] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingDash, setEditingDash] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", widgets: [] });
  const [loaded, setLoaded] = useState(false);

  if (!loaded && companyId) {
    setLoaded(true);
    base44.entities.CustomDashboard.filter({ company_id: companyId }).then(setDashboards);
  }

  function openNew() {
    setEditingDash(null);
    setForm({ name: "", description: "", widgets: [] });
    setBuilderOpen(true);
  }

  function openEdit(dash) {
    setEditingDash(dash);
    setForm({ name: dash.name, description: dash.description || "", widgets: dash.widgets || [] });
    setBuilderOpen(true);
  }

  function toggleWidget(type) {
    setForm(f => {
      const exists = f.widgets.find(w => w.type === type);
      if (exists) return { ...f, widgets: f.widgets.filter(w => w.type !== type) };
      return { ...f, widgets: [...f.widgets, { id: `${type}_${Date.now()}`, type, title: ALL_WIDGETS.find(w => w.type === type)?.label || type }] };
    });
  }

  async function saveDashboard() {
    if (!form.name.trim()) return;
    const payload = { company_id: companyId, name: form.name, description: form.description, widgets: form.widgets };
    if (editingDash) {
      await base44.entities.CustomDashboard.update(editingDash.id, payload);
    } else {
      await base44.entities.CustomDashboard.create(payload);
    }
    const updated = await base44.entities.CustomDashboard.filter({ company_id: companyId });
    setDashboards(updated);
    setBuilderOpen(false);
    setActiveDash(null);
  }

  async function deleteDash(id) {
    await base44.entities.CustomDashboard.delete(id);
    setDashboards(d => d.filter(x => x.id !== id));
    if (activeDash?.id === id) setActiveDash(null);
  }

  if (activeDash) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setActiveDash(null)}>← Back</Button>
          <div>
            <h2 className="font-bold text-slate-900">{activeDash.name}</h2>
            {activeDash.description && <p className="text-sm text-slate-500">{activeDash.description}</p>}
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openEdit(activeDash)}><Edit2 className="w-4 h-4 mr-1" />Edit</Button>
          </div>
        </div>
        {activeDash.widgets?.length === 0 && (
          <div className="text-center py-16 text-slate-400">No widgets added yet. Edit this dashboard to add widgets.</div>
        )}
        <div className="grid lg:grid-cols-2 gap-6">
          {activeDash.widgets?.map(w => (
            <WidgetRenderer key={w.id} type={w.type} data={data} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">Custom Dashboards</h2>
          <p className="text-sm text-slate-500">Build your own report dashboards with any combination of charts</p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" /> New Dashboard
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 shadow-none">
          <CardContent className="py-16 text-center">
            <LayoutDashboard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No custom dashboards yet</p>
            <p className="text-slate-400 text-sm mb-4">Create one to combine your favorite charts</p>
            <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" />Create Dashboard</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map(dash => (
            <Card key={dash.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveDash(dash)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold">{dash.name}</CardTitle>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button className="p-1 text-slate-400 hover:text-blue-600" onClick={() => openEdit(dash)}><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="p-1 text-slate-400 hover:text-red-500" onClick={() => deleteDash(dash.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {dash.description && <p className="text-xs text-slate-500">{dash.description}</p>}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-400">{dash.widgets?.length || 0} widget{dash.widgets?.length !== 1 ? "s" : ""}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {dash.widgets?.slice(0, 3).map(w => (
                    <span key={w.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{w.title}</span>
                  ))}
                  {(dash.widgets?.length || 0) > 3 && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">+{dash.widgets.length - 3} more</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Builder Sheet */}
      <Sheet open={builderOpen} onOpenChange={setBuilderOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingDash ? "Edit Dashboard" : "New Dashboard"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Revenue Overview" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Select Widgets</label>
              <div className="space-y-2">
                {ALL_WIDGETS.map(w => (
                  <label key={w.type} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <Checkbox
                      checked={!!form.widgets.find(fw => fw.type === w.type)}
                      onCheckedChange={() => toggleWidget(w.type)}
                    />
                    <span className="text-sm text-slate-700">{w.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveDashboard} className="bg-blue-600 hover:bg-blue-700 flex-1" disabled={!form.name.trim()}>
                {editingDash ? "Save Changes" : "Create Dashboard"}
              </Button>
              <Button variant="outline" onClick={() => setBuilderOpen(false)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}