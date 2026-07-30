import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/Layout";
import { Layers, ChevronDown, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Inline dropdown that surfaces a company's active Job Templates and calls
 * `onApply(template)` when the user chooses one. Designed to be embedded inline
 * next to other form controls (e.g. on the New Job screen).
 */
export default function TemplatePicker({ onApply, disabled }) {
  const { activeCompany } = useApp();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open || !activeCompany) return;
    setLoading(true);
    base44.entities.JobTemplate.filter({ company_id: activeCompany.id, is_active: true })
      .then((list) => {
        list.sort(
          (a, b) =>
            (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name),
        );
        setTemplates(list);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open, activeCompany?.id]);

  const filtered = templates.filter((t) =>
    `${t.name} ${t.description || ""} ${t.category || ""} ${t.service_type || ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || !activeCompany}
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5"
      >
        <Layers className="w-4 h-4" /> Use Template
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-96 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  autoFocus
                  className="h-8 text-sm pl-7"
                  placeholder="Search templates..."
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  {templates.length === 0 ? (
                    <>
                      No templates yet.
                      <div className="mt-2">
                        <Link to="/JobTemplates" className="text-blue-600 hover:underline font-medium">
                          Create a template →
                        </Link>
                      </div>
                    </>
                  ) : (
                    "No templates match your search."
                  )}
                </div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
                    onClick={() => {
                      onApply?.(t);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <div className="font-semibold text-sm text-slate-800 truncate">{t.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1 text-xs text-slate-500">
                      {t.service_type && (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{t.service_type}</span>
                      )}
                      {t.category && (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{t.category}</span>
                      )}
                      <span>{(t.line_items || []).length} line items</span>
                      {t.estimated_labor_hours ? (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {t.estimated_labor_hours}h
                        </span>
                      ) : null}
                    </div>
                    {t.description && (
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}