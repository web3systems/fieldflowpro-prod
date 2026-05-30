import { useState } from "react";
import { format } from "date-fns";
import { Camera, ChevronDown, ChevronUp, MapPin, Calendar, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const JOB_STATUS = {
  new: { label: "Requested", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  scheduled: { label: "Scheduled", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", dot: "bg-red-400" },
};

const FILTERS = ["all", "scheduled", "in_progress", "completed"];

export default function PortalJobs({ jobs, company }) {
  const accentColor = company?.primary_color || "#2563eb";
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState({});

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 mb-5">My Jobs</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              filter === f ? "text-white border-transparent shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            style={filter === f ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
          >
            {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">No jobs found</p>
          <p className="text-sm mt-1">Your scheduled appointments will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const s = JOB_STATUS[job.status] || JOB_STATUS.new;
            const hasPhotos = job.before_photos?.length > 0 || job.after_photos?.length > 0;
            const isOpen = expanded[job.id];
            const completedItems = (job.checklist || []).filter(c => c.completed).length;
            const totalItems = (job.checklist || []).length;

            return (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  className="w-full text-left p-4"
                  onClick={() => setExpanded(e => ({ ...e, [job.id]: !e[job.id] }))}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800 truncate">{job.title}</p>
                        <Badge className={`text-xs flex-shrink-0 ${s.color}`}>{s.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        {job.scheduled_start && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(job.scheduled_start), "EEE, MMM d, yyyy")}
                          </span>
                        )}
                        {job.address && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.address}
                          </span>
                        )}
                      </div>
                      {totalItems > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completedItems / totalItems) * 100}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{completedItems}/{totalItems}</span>
                        </div>
                      )}
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 space-y-4">
                    {job.description && (
                      <div className="pt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>
                      </div>
                    )}
                    {job.notes && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{job.notes}</p>
                      </div>
                    )}

                    {hasPhotos && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5" /> Project Photos
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {job.before_photos?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Before
                              </p>
                              <div className="grid grid-cols-3 gap-1">
                                {job.before_photos.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt="" className="aspect-square object-cover rounded-lg w-full hover:opacity-90 transition-opacity" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {job.after_photos?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> After
                              </p>
                              <div className="grid grid-cols-3 gap-1">
                                {job.after_photos.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt="" className="aspect-square object-cover rounded-lg w-full hover:opacity-90 transition-opacity" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
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