import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WorkLogGroup({ icon: Icon, label, count, isExpanded, onToggle, children, level = 0 }) {
  const indent = level === 1 ? "ml-3" : level === 2 ? "ml-6" : "";
  return (
    <div className={indent}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors text-left ${
          level === 0 ? "bg-slate-50 border border-slate-200" : ""
        }`}
      >
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "" : "-rotate-90"}`} />
        {Icon && <Icon className={`flex-shrink-0 ${level === 0 ? "w-4 h-4 text-slate-600" : "w-3.5 h-3.5 text-slate-400"}`} />}
        <span className={`${level === 0 ? "font-bold text-slate-800" : "font-semibold text-sm text-slate-600"}`}>{label}</span>
        {count != null && count > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs font-normal text-slate-500">{count}</Badge>
        )}
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}