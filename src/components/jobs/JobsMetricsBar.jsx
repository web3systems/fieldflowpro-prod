import { Briefcase, Activity, CalendarClock, AlertTriangle, DollarSign } from "lucide-react";

const STATUS_PILLS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
  { value: "estimated", label: "Est", color: "bg-sky-100 text-sky-700" },
  { value: "scheduled", label: "Sched", color: "bg-purple-100 text-purple-700" },
  { value: "in_progress", label: "Active", color: "bg-amber-100 text-amber-700" },
  { value: "completed", label: "Done", color: "bg-green-100 text-green-700" },
];

function isLate(job) {
  if (["completed", "cancelled", "archived"].includes(job.status)) return false;
  if (!job.scheduled_start) return false;
  return new Date(job.scheduled_start) < new Date();
}

function isRequiresInvoicing(job, invoiceJobIds) {
  return job.status === "completed" && !invoiceJobIds.has(job.id);
}

export default function JobsMetricsBar({ jobs, invoiceJobIds }) {
  const now = new Date();
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysFromNow = new Date(); thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const totalJobs = jobs.length;
  const statusCounts = {};
  jobs.forEach(j => { statusCounts[j.status] = (statusCounts[j.status] || 0) + 1; });

  const recentJobs = jobs.filter(j => {
    if (!j.scheduled_start) return false;
    const d = new Date(j.scheduled_start);
    return d >= thirtyDaysAgo && d <= now;
  });
  const recentValue = recentJobs.reduce((sum, j) => sum + (j.total_amount || 0), 0);

  const upcomingJobs = jobs.filter(j => {
    if (!j.scheduled_start) return false;
    const d = new Date(j.scheduled_start);
    return d >= now && d <= thirtyDaysFromNow;
  });
  const upcomingValue = upcomingJobs.reduce((sum, j) => sum + (j.total_amount || 0), 0);

  const lateCount = jobs.filter(isLate).length;
  const requiresInvoicingCount = jobs.filter(j => isRequiresInvoicing(j, invoiceJobIds)).length;
  const attentionCount = lateCount + requiresInvoicingCount;

  const fmtMoney = (v) => "$" + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Jobs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Total Jobs</span>
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{totalJobs}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {STATUS_PILLS.map(s => (
            <span key={s.value} className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.color}`}>
              {s.label}: {statusCounts[s.value] || 0}
            </span>
          ))}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
            Late: {lateCount}
          </span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Recent Activity (Last 30 Days)</span>
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{recentJobs.length}</p>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-0.5">
          <DollarSign className="w-3 h-3" /> {fmtMoney(recentValue)} total value
        </p>
      </div>

      {/* Upcoming */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Upcoming (Next 30 Days)</span>
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{upcomingJobs.length}</p>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-0.5">
          <DollarSign className="w-3 h-3" /> {fmtMoney(upcomingValue)} total value
        </p>
      </div>

      {/* Requires Attention */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-xs font-medium text-red-600">Requires Attention</span>
        </div>
        <p className="text-2xl font-bold text-red-600 leading-tight">{attentionCount}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
            Late: {lateCount}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
            Needs Invoice: {requiresInvoicingCount}
          </span>
        </div>
      </div>
    </div>
  );
}