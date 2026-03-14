import { format, parseISO } from "date-fns";
import { Briefcase, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UpcomingAppointments({ jobs, technicians }) {
  const now = new Date();
  const upcoming = jobs
    .filter(j => j.scheduled_start && new Date(j.scheduled_start) >= now && j.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));

  return (
    <div className="bg-white rounded-xl shadow-sm border-0 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
        <Calendar className="w-4 h-4 text-slate-500" /> Upcoming appointments
      </h3>

      {upcoming.length === 0 ? (
        <div className="text-center py-6 text-slate-400">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No upcoming appointments</p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-4 gap-2 pb-2 mb-2 border-b border-slate-100">
            {["Date","Time","Work","Employee"].map(h => (
              <span key={h} className="text-xs font-semibold text-slate-500">{h}</span>
            ))}
          </div>
          <div className="space-y-2">
            {upcoming.map(job => {
              const start = parseISO(job.scheduled_start);
              const end = job.scheduled_end ? parseISO(job.scheduled_end) : null;
              const assignedTech = technicians.find(t => job.assigned_techs?.includes(t.id));
              return (
                <div key={job.id} className="grid grid-cols-4 gap-2 items-center py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-700">{format(start, "EEE, MM/dd/yyyy")}</span>
                  <span className="text-xs text-slate-600">
                    {format(start, "h:mm a")}{end ? ` - ${format(end, "h:mm a")}` : ""}
                  </span>
                  <Link to={createPageUrl(`Jobs`)} className="text-xs text-blue-600 hover:underline truncate">
                    {job.title}
                  </Link>
                  <div className="flex items-center gap-1.5">
                    {assignedTech ? (
                      <>
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {assignedTech.first_name?.[0]}{assignedTech.last_name?.[0]}
                        </div>
                        <span className="text-xs text-slate-700 truncate">{assignedTech.first_name} {assignedTech.last_name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Unassigned</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}