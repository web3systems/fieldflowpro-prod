import { format } from "date-fns";
import { Briefcase, FileText, DollarSign, MessageCircle, PlusCircle, ChevronRight, AlertCircle, Phone, Mail, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const JOB_STATUS = {
  new: { label: "Requested", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  scheduled: { label: "Scheduled", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", dot: "bg-red-400" },
};

export default function PortalHome({ customer, company, jobs, invoices, estimates, setActiveTab }) {
  const accentColor = company?.primary_color || "#2563eb";

  const upcomingJobs = jobs.filter(j => ["scheduled", "in_progress", "new"].includes(j.status)).slice(0, 3);
  const pendingEstimates = estimates.filter(e => ["sent", "viewed"].includes(e.status));
  const unpaidInvoices = invoices.filter(i => !["paid"].includes(i.status));
  const totalDue = unpaidInvoices.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.amount_paid || 0)), 0);

  const quickActions = [
    { label: "Request Service", icon: PlusCircle, tab: "account", sub: "book", color: "bg-blue-50 text-blue-600 border-blue-100" },
    { label: "My Jobs", icon: Briefcase, tab: "jobs", color: "bg-purple-50 text-purple-600 border-purple-100" },
    { label: "Review Estimate", icon: FileText, tab: "estimates", color: "bg-amber-50 text-amber-600 border-amber-100" },
    { label: "Pay Invoice", icon: DollarSign, tab: "invoices", color: "bg-green-50 text-green-600 border-green-100" },
    { label: "Message Us", icon: MessageCircle, tab: "account", sub: "messages", color: "bg-rose-50 text-rose-600 border-rose-100" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
        <p className="text-sm font-medium opacity-80 mb-1">Welcome back,</p>
        <h1 className="text-2xl font-bold">{customer?.first_name} {customer?.last_name}</h1>
        <p className="text-sm opacity-75 mt-1">{company?.name}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setActiveTab("jobs")} className="bg-white rounded-2xl p-4 text-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-slate-800">{upcomingJobs.length}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium">Upcoming</div>
          <div className="text-xs text-slate-400">Jobs</div>
        </button>
        <button onClick={() => setActiveTab("estimates")} className="bg-white rounded-2xl p-4 text-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-amber-600">{pendingEstimates.length}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium">Pending</div>
          <div className="text-xs text-slate-400">Estimates</div>
        </button>
        <button onClick={() => setActiveTab("invoices")} className="bg-white rounded-2xl p-4 text-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-red-500">${totalDue.toFixed(0)}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium">Balance</div>
          <div className="text-xs text-slate-400">Due</div>
        </button>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map(({ label, icon: Icon, tab, color }) => (
            <button
              key={label}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center font-medium text-sm transition-all hover:shadow-md ${color}`}
            >
              <Icon className="w-6 h-6" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming jobs */}
      {upcomingJobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Upcoming Jobs</h2>
            <button onClick={() => setActiveTab("jobs")} className="text-xs font-semibold flex items-center gap-1" style={{ color: accentColor }}>
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {upcomingJobs.map(job => {
              const s = JOB_STATUS[job.status] || JOB_STATUS.new;
              return (
                <div key={job.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{job.title}</p>
                    <p className="text-xs text-slate-500">
                      {job.scheduled_start ? format(new Date(job.scheduled_start), "EEE, MMM d") : "Date TBD"}
                    </p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${s.color}`}>{s.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending estimates */}
      {pendingEstimates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Action Needed</h2>
          </div>
          {pendingEstimates.slice(0, 2).map(est => (
            <button key={est.id} onClick={() => setActiveTab("estimates")} className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 mb-2 hover:bg-amber-100 transition-colors">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-800 text-sm">{est.title}</p>
                <p className="text-xs text-amber-700">Estimate pending your approval — ${(est.total || 0).toFixed(2)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </button>
          ))}
        </div>
      )}

      {/* Unpaid invoices alert */}
      {unpaidInvoices.length > 0 && (
        <button onClick={() => setActiveTab("invoices")} className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-red-100 transition-colors">
          <DollarSign className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="font-semibold text-slate-800 text-sm">{unpaidInvoices.length} unpaid invoice{unpaidInvoices.length > 1 ? "s" : ""}</p>
            <p className="text-xs text-red-600">Total due: ${totalDue.toFixed(2)}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-red-500" />
        </button>
      )}
      {/* Support Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Need Help?</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">Get in touch with {company?.name || "us"} and we'll get back to you as soon as possible.</p>
        <div className="flex flex-col gap-2">
          {company?.phone && (
            <a
              href={`tel:${company.phone}`}
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Phone className="w-4 h-4 text-slate-400" />
              {company.phone}
            </a>
          )}
          {company?.email && (
            <a
              href={`mailto:${company.email}`}
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Mail className="w-4 h-4 text-slate-400" />
              {company.email}
            </a>
          )}
        </div>
      </div>

    </div>
  );
}