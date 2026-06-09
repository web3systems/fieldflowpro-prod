import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Copy, Sparkles } from "lucide-react";
import { TEMPLATE_META, TEMPLATE_CATEGORIES } from "./TemplateDefaults";

const CATEGORY_COLORS = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  slate: "bg-slate-100 text-slate-600 border-slate-300",
};

function getCategoryForType(type) {
  for (const [key, cat] of Object.entries(TEMPLATE_CATEGORIES)) {
    if (cat.types.includes(type)) return { key, ...cat };
  }
  return { key: "custom", label: "Custom", color: "slate" };
}

export default function TemplateList({ templates, onEdit, onDelete, onDuplicate, onNew, seeding }) {
  const grouped = {};
  for (const [catKey, cat] of Object.entries(TEMPLATE_CATEGORIES)) {
    const catTemplates = templates.filter(t => cat.types.includes(t.template_type));
    if (catTemplates.length > 0) grouped[catKey] = { ...cat, templates: catTemplates };
  }

  // Ungrouped custom
  const customTemplates = templates.filter(t => t.template_type === "custom");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-slate-500 text-sm mt-1">Manage how your automated emails look and what they say.</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button variant="outline" onClick={onNew} disabled={seeding} className="gap-1">
              <Sparkles className="w-4 h-4 text-purple-500" />
              {seeding ? "Creating defaults..." : "Seed Default Templates"}
            </Button>
          )}
          <Button onClick={onNew} className="gap-1">
            <Plus className="w-4 h-4" /> New Template
          </Button>
        </div>
      </div>

      {templates.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-xl border-slate-200">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No templates yet</p>
          <p className="text-slate-400 text-sm mt-1">Create a new template or seed the standard defaults to get started.</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={() => onNew(true)} disabled={seeding}>
              <Sparkles className="w-4 h-4 mr-1 text-purple-500" />
              {seeding ? "Creating..." : "Add Default Templates"}
            </Button>
            <Button onClick={() => onNew(false)}>
              <Plus className="w-4 h-4 mr-1" /> Create Custom
            </Button>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([catKey, cat]) => (
        <div key={catKey}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-slate-800">{cat.label}</h2>
            <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[cat.color]}`}>{cat.templates.length}</Badge>
          </div>
          <div className="space-y-2">
            {cat.templates.map(t => {
              const meta = TEMPLATE_META[t.template_type] || TEMPLATE_META.custom;
              return (
                <div key={t.id} className="flex items-center gap-4 p-4 bg-white border rounded-xl hover:shadow-sm transition-shadow">
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0"
                    style={{ background: t.header_color || "#3B82F6" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{t.name}</p>
                      {t.is_default && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Default</Badge>}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{t.subject || meta.description}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => onDuplicate(t)} className="text-slate-400 hover:text-slate-700">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(t)} className="text-slate-400 hover:text-slate-700">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(t)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}