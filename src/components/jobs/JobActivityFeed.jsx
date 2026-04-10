import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Calendar, User, Wrench, DollarSign, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

function getIcon(type) {
  if (type?.includes("scheduled")) return <Calendar className="w-4 h-4 text-blue-500" />;
  if (type?.includes("dispatched") || type?.includes("assigned")) return <User className="w-4 h-4 text-purple-500" />;
  if (type?.includes("invoice")) return <FileText className="w-4 h-4 text-green-500" />;
  if (type?.includes("payment")) return <DollarSign className="w-4 h-4 text-emerald-500" />;
  return <Wrench className="w-4 h-4 text-slate-400" />;
}

export default function JobActivityFeed({ job, form, customer, techs = [] }) {
  const [expanded, setExpanded] = useState(true);

  // Build activity entries from job data
  const activities = [];

  if (job?.created_date) {
    activities.push({
      id: "created",
      type: "created",
      text: `Job created${form.total_amount ? `: total = $${(form.total_amount || 0).toFixed(2)}` : ""}`,
      actor: job.created_by || "System",
      date: job.created_date,
    });
  }

  if (form.scheduled_start) {
    activities.push({
      id: "scheduled",
      type: "scheduled",
      text: `Job scheduled for ${format(new Date(form.scheduled_start), "EEE, MMM d")} between ${format(new Date(form.scheduled_start), "h:mma")}${form.scheduled_end ? `–${format(new Date(form.scheduled_end), "h:mma")}` : ""}`,
      actor: job?.created_by || "System",
      date: form.scheduled_start,
    });
  }

  if ((form.assigned_techs || []).length > 0) {
    const techNames = (form.assigned_techs || [])
      .map(id => techs.find(t => t.id === id))
      .filter(Boolean)
      .map(t => `${t.first_name} ${t.last_name}`)
      .join(", ");
    if (techNames) {
      activities.push({
        id: "dispatched",
        type: "dispatched",
        text: `Dispatched to ${techNames}`,
        actor: job?.created_by || "System",
        date: form.scheduled_start || job?.created_date,
      });
    }
  }

  if (form.status === "in_progress" && form.actual_start) {
    activities.push({
      id: "started",
      type: "started",
      text: "Job started",
      actor: job?.created_by || "System",
      date: form.actual_start,
    });
  }

  if (form.status === "completed" && form.actual_end) {
    activities.push({
      id: "completed",
      type: "completed",
      text: "Job completed",
      actor: job?.created_by || "System",
      date: form.actual_end,
    });
  }

  // Sort newest first
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  function getInitials(email) {
    if (!email) return "?";
    return email.split("@")[0].slice(0, 2).toUpperCase();
  }

  const COLORS = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-rose-500", "bg-orange-500"];
  const actorColorMap = {};
  let colorIdx = 0;
  function getColor(actor) {
    if (!actorColorMap[actor]) {
      actorColorMap[actor] = COLORS[colorIdx++ % COLORS.length];
    }
    return actorColorMap[actor];
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-slate-800">Activity feed</h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400 italic px-5 py-4">No activity recorded yet.</p>
          ) : (
            activities.map(activity => (
              <div key={activity.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                <div className={`w-8 h-8 rounded-full ${getColor(activity.actor)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                  {getInitials(activity.actor)}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getIcon(activity.type)}
                  </div>
                  <p className="text-sm text-slate-700 flex-1">{activity.text}</p>
                </div>
                <div className="text-xs text-slate-400 text-right flex-shrink-0">
                  {activity.date ? (
                    <>
                      <div>{format(new Date(activity.date), "M/d/yy")}</div>
                      <div>{format(new Date(activity.date), "h:mma")}</div>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}