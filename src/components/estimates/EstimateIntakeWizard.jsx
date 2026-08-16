import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { JOB_TYPES, getJobType, calcTotals } from "@/lib/estimateJobTypes";
import {
  Fence, Grid2x2, Home, PaintRoller, Truck, CloudRain,
  DoorClosed, Hammer, Plug, Wrench, Zap, House,
  ArrowRight, ArrowLeft, Check, Search, Loader2, AlertTriangle, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ICONS = {
  Fence, Grid2x2, Home, PaintRoller, Truck, CloudRain,
  DoorClosed, Hammer, Plug, Wrench, Zap, House,
};

export default function EstimateIntakeWizard({ onApply, onSkip }) {
  const [step, setStep] = useState("choose"); // choose | questions
  const [selectedId, setSelectedId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [search, setSearch] = useState("");
  const [estimatorConfig, setEstimatorConfig] = useState(null);

  useEffect(() => {
    base44.entities.EstimatorConfig.list()
      .then(recs => setEstimatorConfig(recs[0] || null))
      .catch(() => setEstimatorConfig(null));
  }, []);

  const selected = getJobType(selectedId);

  function chooseType(id) {
    setSelectedId(id);
    setAnswers({});
    setStep("questions");
  }

  function updateAnswer(qId, value) {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  }

  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);

  async function startEstimate() {
    if (!selected) return;
    const template = selected.build(answers, estimatorConfig);
    setReviewing(true);
    setReviewResult(null);
    try {
      const res = await base44.functions.invoke('analyzeEstimateBid', {
        title: template.title,
        line_items: template.line_items,
        total: calcTotals(template.line_items).total,
        scope_of_work: template.scope_of_work,
        service_type: selected.label,
        apply_corrections: true,
      });
      const data = res?.data || res;
      if (data?.corrected_line_items?.length) {
        const corrected = data.corrected_line_items.map(li => ({
          description: li.description,
          category: li.category,
          quantity: Number(li.quantity) || 0,
          unit_price: Number(li.unit_price) || 0,
          total: Number(li.total) || 0,
        }));
        template.line_items = corrected;
        template._reviewNotes = {
          issues: data.issues || [],
          summary: data.summary || '',
          corrections_applied: data.corrections_applied || '',
        };
      }
      setReviewResult(data);
      // Brief pause so the user sees the review summary, then apply
      setTimeout(() => onApply(template), 1200);
    } catch (e) {
      // If review fails, just apply the original template
      onApply(template);
    } finally {
      setReviewing(false);
    }
  }

  const filtered = JOB_TYPES.filter(j =>
    !search || j.label.toLowerCase().includes(search.toLowerCase()) || j.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {step === "questions" && (
            <Button variant="ghost" size="sm" onClick={() => setStep("choose")} className="gap-1 text-slate-500">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <div>
            <span className="font-semibold text-slate-800">
              {step === "choose" ? "New Estimate — Choose Job Type" : `${selected?.label} — Project Details`}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={onSkip} className="text-slate-500">
          Start blank estimate
        </Button>
      </div>

      {/* Step 1: Choose job type */}
      {step === "choose" && (
        <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
          <div className="mb-5 relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search job types..."
              className="pl-9 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(jt => {
              const Icon = ICONS[jt.icon] || Hammer;
              return (
                <button
                  key={jt.id}
                  type="button"
                  onClick={() => chooseType(jt.id)}
                  className="group flex flex-col items-start gap-2 p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{jt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{jt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-6">
            Templates pre-fill typical labor and materials based on Chittenden County, VT pricing ($85/hr labor, 30% material markup). Adjust anything in the estimate after it's created.
          </p>
        </div>
      )}

      {/* Step 2: Questions */}
      {step === "questions" && selected && (
        <div className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                {(() => { const Icon = ICONS[selected.icon] || Hammer; return <Icon className="w-5 h-5" />; })()}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{selected.label}</p>
                <p className="text-xs text-slate-500">Answer a few questions to build the estimate.</p>
              </div>
            </div>

            {selected.questions.map(q => (
              <div key={q.id}>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">{q.label}</Label>
                {q.type === "select" ? (
                  <select
                    value={answers[q.id] || ""}
                    onChange={e => updateAnswer(q.id, e.target.value)}
                    className="w-full h-9 text-sm border border-input rounded-md bg-white px-2"
                  >
                    <option value="">Select...</option>
                    {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : q.type === "text" ? (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={e => updateAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    rows={2}
                    className="bg-white"
                  />
                ) : (
                  <Input
                    type="number"
                    value={answers[q.id] || ""}
                    onChange={e => updateAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    className="bg-white"
                  />
                )}
              </div>
            ))}

            {/* Preview of generated template */}
            {Object.keys(answers).length > 0 && (() => {
              const preview = selected.build(answers, estimatorConfig);
              const totals = calcTotals(preview.line_items);
              return (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600" /> Preview
                  </p>
                  <p className="text-sm font-medium text-slate-800">{preview.title}</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {preview.line_items.map((li, i) => (
                      <div key={i} className="flex justify-between text-xs text-slate-600">
                        <span className="truncate pr-2">{li.description}</span>
                        <span className="font-medium">${li.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
                    <span>Estimated Total</span>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Review result */}
            {reviewResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Review Complete
                </p>
                <p className="text-xs text-slate-600">{reviewResult.summary}</p>
                {(reviewResult.issues || []).length > 0 && (
                  <div className="space-y-1">
                    {reviewResult.issues.map((iss, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                        <span>{iss.message} — <em className="text-slate-500">{iss.suggestion}</em></span>
                      </div>
                    ))}
                  </div>
                )}
                {reviewResult.corrections_applied && (
                  <p className="text-xs text-blue-700 font-medium pt-1">{reviewResult.corrections_applied}</p>
                )}
                <p className="text-xs text-slate-400 pt-1">Opening estimate with corrections applied…</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("choose")} disabled={reviewing}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={startEstimate} disabled={reviewing} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
                {reviewing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Reviewing & fixing…</>
                ) : (
                  <>Build Estimate <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}