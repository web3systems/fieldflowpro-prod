import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Inbox, FileText, Briefcase, DollarSign, ArrowRight } from "lucide-react";

// Pipeline-style stage cards: Requests → Quotes → Jobs → Invoices
export default function WorkflowStages({ bookings, estimates, jobs, invoices, loading }) {
  const openEstimates = estimates.filter(e => ["draft", "sent", "viewed"].includes(e.status));
  const activeJobs = jobs.filter(j => ["new", "scheduled", "in_progress"].includes(j.status));
  const outstandingInvoices = invoices.filter(i => ["sent", "viewed", "overdue", "partial"].includes(i.status));

  const stages = [
    {
      label: "Requests",
      count: bookings.length,
      icon: Inbox,
      accent: "bg-sky-50 text-sky-600",
      bar: "bg-sky-500",
      link: createPageUrl("Schedule"),
      hint: "Pending bookings",
    },
    {
      label: "Quotes",
      count: openEstimates.length,
      icon: FileText,
      accent: "bg-indigo-50 text-indigo-600",
      bar: "bg-indigo-500",
      link: createPageUrl("Estimates"),
      hint: "Open estimates",
    },
    {
      label: "Jobs",
      count: activeJobs.length,
      icon: Briefcase,
      accent: "bg-blue-50 text-blue-600",
      bar: "bg-blue-600",
      link: createPageUrl("Jobs"),
      hint: "Active jobs",
    },
    {
      label: "Invoices",
      count: outstandingInvoices.length,
      icon: DollarSign,
      accent: "bg-violet-50 text-violet-600",
      bar: "bg-violet-500",
      link: createPageUrl("Invoices"),
      hint: "Outstanding",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stages.map((s, i) => (
        <Link key={s.label} to={s.link}>
          <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-blue-300 transition-all overflow-hidden">
            <div className={`absolute top-0 left-0 h-1 w-full ${s.bar}`} />
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg ${s.accent} flex items-center justify-center`}>
                <s.icon className="w-4.5 h-4.5" strokeWidth={1.8} />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-tight">
              {loading ? "—" : s.count}
            </div>
            <div className="text-sm font-medium text-slate-700">{s.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.hint}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}