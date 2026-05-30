import { format } from "date-fns";
import { ThumbsUp, ThumbsDown, FileText, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const EST_STATUS = {
  sent: { label: "Awaiting Review", color: "bg-blue-100 text-blue-700", icon: Clock },
  viewed: { label: "Awaiting Review", color: "bg-blue-100 text-blue-700", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  declined: { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
  expired: { label: "Expired", color: "bg-slate-100 text-slate-500", icon: XCircle },
};

export default function PortalEstimates({ estimates, company, onDecision }) {
  const accentColor = company?.primary_color || "#2563eb";
  const [expanded, setExpanded] = useState({});
  const [deciding, setDeciding] = useState({});

  async function handleDecision(est, decision) {
    setDeciding(d => ({ ...d, [est.id]: decision }));
    await onDecision(est, decision);
    setDeciding(d => { const n = {...d}; delete n[est.id]; return n; });
  }

  const pending = estimates.filter(e => ["sent", "viewed"].includes(e.status));
  const rest = estimates.filter(e => !["sent", "viewed"].includes(e.status));
  const sorted = [...pending, ...rest];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 mb-5">Estimates</h1>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">No estimates yet</p>
          <p className="text-sm mt-1">Estimates from your service provider will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(est => {
            const s = EST_STATUS[est.status] || EST_STATUS.sent;
            const isOpen = expanded[est.id];
            const isPending = ["sent", "viewed"].includes(est.status);

            return (
              <div key={est.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isPending ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-100"}`}>
                <button className="w-full text-left p-4" onClick={() => setExpanded(e => ({ ...e, [est.id]: !e[est.id] }))}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-slate-800 truncate">{est.title}</p>
                        <Badge className={`text-xs flex-shrink-0 ${s.color}`}>{s.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {est.estimate_number ? `#${est.estimate_number}` : ""}
                          {est.valid_until ? ` · Valid until ${format(new Date(est.valid_until), "MMM d, yyyy")}` : ""}
                        </span>
                        <span className="text-lg font-bold text-slate-800">${(est.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 space-y-3">
                    {/* Line items */}
                    {(est.options?.length > 0 ? est.options[0].line_items : est.line_items)?.length > 0 && (
                      <div className="pt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Line Items</p>
                        <div className="space-y-1.5">
                          {(est.options?.length > 0 ? est.options[0].line_items : est.line_items).map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                              <span className="text-slate-700">{item.description}</span>
                              <span className="font-semibold text-slate-800">${(item.total || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {est.notes && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{est.notes}</p>
                      </div>
                    )}

                    {isPending && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleDecision(est, "approved")}
                          disabled={!!deciding[est.id]}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          {deciding[est.id] === "approved" ? "Approving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleDecision(est, "declined")}
                          disabled={!!deciding[est.id]}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border-2 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          {deciding[est.id] === "declined" ? "Declining..." : "Decline"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}