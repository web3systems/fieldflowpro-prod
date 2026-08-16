import { Link } from "react-router-dom";
import {
  Clock, User, CheckCircle, AlertTriangle, ChevronRight, FileText, Calendar, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

const STATUS_COLORS = {
  submitted: "bg-blue-100 text-blue-700",
  reviewed: "bg-green-100 text-green-700",
  draft: "bg-slate-100 text-slate-600",
};

export default function WorkLogCard({ log, job, customer, isExpanded, onToggle, onMarkReviewed }) {
  return (
    <Card className={`border shadow-sm transition-all ${log.follow_up_needed ? "border-l-4 border-l-amber-400" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 cursor-pointer" onClick={onToggle}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900">{log.technician_name}</span>
              <Badge className={`text-xs ${STATUS_COLORS[log.status] || ""}`}>{log.status}</Badge>
              {log.follow_up_needed && (
                <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3 h-3 mr-1 inline" /> Follow-up needed
                </Badge>
              )}
              {log.customer_satisfied === false && (
                <Badge className="text-xs bg-red-100 text-red-700">Customer concern</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {job && (
                <Link
                  to={`/JobDetail/${job.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />{job.title}
                </Link>
              )}
              {customer && (
                <span className="text-xs text-slate-500">
                  <User className="w-3 h-3 inline mr-0.5" />{customer.first_name} {customer.last_name}
                </span>
              )}
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />{log.date ? format(new Date(log.date), "MMM d, yyyy") : ""}
              </span>
              {log.duration_minutes && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m
                </span>
              )}
            </div>
            {log.ai_summary && (
              <p className="text-sm text-slate-600 mt-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                <Sparkles className="w-3 h-3 inline mr-1 text-blue-500" />
                {log.ai_summary}
              </p>
            )}
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {log.work_performed && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Work Performed</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.work_performed}</p>
              </div>
            )}
            {log.materials_used?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Materials Used</p>
                <div className="space-y-1">
                  {log.materials_used.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-slate-400">×{m.quantity} {m.unit}</span>
                      {m.cost && <span className="text-slate-400">${m.cost}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {log.issues_found && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Issues Found</p>
                <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">{log.issues_found}</p>
              </div>
            )}
            {log.follow_up_notes && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Follow-Up Notes</p>
                <p className="text-sm text-amber-800">{log.follow_up_notes}</p>
              </div>
            )}
            {log.clock_in && log.clock_out && (
              <p className="text-xs text-slate-400">
                On site: {format(new Date(log.clock_in), "h:mm a")} – {format(new Date(log.clock_out), "h:mm a")}
              </p>
            )}
            {log.voice_transcript && (
              <details className="text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-600">View voice transcript</summary>
                <p className="mt-1 p-2 bg-slate-50 rounded text-slate-500 whitespace-pre-wrap">{log.voice_transcript}</p>
              </details>
            )}
            {log.status === "submitted" && (
              <Button size="sm" variant="outline" className="gap-1.5 text-green-700" onClick={onMarkReviewed}>
                <CheckCircle className="w-3.5 h-3.5" /> Mark Reviewed
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}