import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, X, AlertTriangle, Lightbulb, Loader2, TrendingDown, ListChecks } from "lucide-react";

/**
 * EstimateAISuggestion
 * Watches an estimate being built and pops up a dismissible suggestion card
 * when the AI detects a low bid or missing standard tasks for the job type.
 *
 * Props:
 *   form          — the estimate form object (title, line_items, total, scope_of_work, service_type)
 *   companyIndustry — optional trade/industry hint
 */
export default function EstimateAISuggestion({ form, companyIndustry }) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lastSignature, setLastSignature] = useState("");
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  // Build a lightweight signature of what matters so we only re-run when content changes
  const signature = JSON.stringify({
    title: form?.title || "",
    total: Number(form?.total || 0).toFixed(2),
    items: (form?.line_items || []).map(i => `${i.description || ""}|${i.category || ""}|${i.quantity || 0}|${i.unit_price || 0}`),
    scope: (form?.scope_of_work || "").replace(/<[^>]*>/g, "").slice(0, 200),
  });

  useEffect(() => {
    if (dismissed) return;
    // Need a title and at least one line item with a description or price to review
    const hasTitle = !!form?.title?.trim();
    const realItems = (form?.line_items || []).filter(i => (i.description?.trim() || (i.unit_price || 0) > 0));
    if (!hasTitle || realItems.length === 0) {
      setSuggestion(null);
      setLastSignature("");
      return;
    }
    // Don't re-run if nothing meaningful changed
    if (signature === lastSignature) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runAnalysis();
    }, 2500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [signature, dismissed]);

  async function runAnalysis() {
    setLoading(true);
    const myReq = ++reqIdRef.current;
    try {
      const res = await base44.functions.invoke("analyzeEstimateBid", {
        title: form.title,
        line_items: form.line_items,
        total: form.total,
        scope_of_work: form.scope_of_work,
        service_type: form.service_type || form.title,
        company_industry: companyIndustry,
      });
      // Ignore stale responses
      if (myReq !== reqIdRef.current) return;
      const data = res.data || res;
      setLastSignature(signature);
      if (data?.should_alert && data.issues?.length > 0) {
        setSuggestion(data);
      } else {
        setSuggestion(null);
      }
    } catch (e) {
      // Silent fail — don't bother the user with AI errors
      setSuggestion(null);
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }

  if (dismissed) return null;

  // Loading indicator (subtle, bottom-right)
  if (loading && !suggestion) {
    return (
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-white border border-slate-200 shadow-lg rounded-full px-4 py-2">
        <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-500">Reviewing estimate…</span>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 bg-white border border-amber-200 shadow-2xl rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">AI Estimate Review</p>
            <p className="text-[11px] text-slate-500">{suggestion.summary || "Heads up on this bid"}</p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Issues */}
      <div className="px-4 py-3 space-y-2.5 max-h-64 overflow-y-auto">
        {suggestion.issues.map((issue, i) => (
          <div key={i} className="flex gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              issue.type === "low_bid" ? "bg-red-100" : "bg-blue-100"
            }`}>
              {issue.type === "low_bid"
                ? <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                : <ListChecks className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">
                {issue.type === "low_bid" ? "Possibly bid too low" : "Missing standard task"}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{issue.message}</p>
              {issue.suggestion && (
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                  <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                  <span>{issue.suggestion}</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          AI guidance — verify before acting
        </span>
        <button onClick={() => setDismissed(true)} className="text-xs font-medium text-slate-500 hover:text-slate-700">
          Dismiss
        </button>
      </div>
    </div>
  );
}