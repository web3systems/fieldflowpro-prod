import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Info } from "lucide-react";

/**
 * MarginRulesStrip
 * Compact, read-only display of the company's active Margin Rules.
 * Shown on estimate-editing screens so estimators can see the configured
 * markup thresholds while they build pricing.
 */
export default function MarginRulesStrip({ companyId }) {
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    base44.entities.MarginRule
      .filter({ company_id: companyId })
      .then((rules) => setRule(rules[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return null;

  const defaultMarkup = rule?.min_markup_pct ?? 30;

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5 flex items-center gap-x-4 gap-y-1.5 flex-wrap text-xs">
      <span className="font-semibold text-violet-700 flex items-center gap-1 flex-shrink-0">
        <ShieldCheck className="w-3.5 h-3.5" /> Margin Rules
      </span>
      <span className="text-slate-600">
        Default <b className="text-slate-800">{defaultMarkup}%</b> markup
      </span>
      {rule?.labor_markup_pct != null && (
        <span className="text-slate-600">
          Labor <b className="text-slate-800">{rule.labor_markup_pct}%</b>
        </span>
      )}
      {rule?.materials_markup_pct != null && (
        <span className="text-slate-600">
          Materials <b className="text-slate-800">{rule.materials_markup_pct}%</b>
        </span>
      )}
      {rule?.min_total_amount > 0 && (
        <span className="text-slate-600">
          Min <b className="text-slate-800">${rule.min_total_amount.toLocaleString()}</b>
        </span>
      )}
      {rule?.auto_approve && (
        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
          Auto-approve ON
        </span>
      )}
      {!rule && (
        <span className="text-slate-400 flex items-center gap-1">
          <Info className="w-3 h-3" /> Using {defaultMarkup}% default — configure in Settings
        </span>
      )}
    </div>
  );
}