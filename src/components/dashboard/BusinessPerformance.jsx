import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, CalendarClock, Wallet, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

// Right-side business performance panel: Receivables, Upcoming Jobs, Revenue
export default function BusinessPerformance({ invoices, jobs, loading }) {
  const receivable = invoices
    .filter(i => ["sent", "viewed", "overdue", "partial"].includes(i.status))
    .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);
  const collected = invoices
    .filter(i => i.status === "paid")
    .reduce((s, i) => s + (i.total || 0), 0);

  const upcoming = jobs
    .filter(j => ["scheduled", "new"].includes(j.status) && j.scheduled_start)
    .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start))
    .slice(0, 4);

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800">Business Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Receivables */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Receivables</p>
            <p className="text-lg font-bold text-slate-900 leading-tight">
              {loading ? "—" : `$${receivable.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
            </p>
          </div>
          <Link to={createPageUrl("Invoices")} className="text-slate-300 hover:text-blue-600">
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="border-t border-slate-100" />

        {/* Upcoming Jobs */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Upcoming Jobs</p>
          </div>
          {loading ? (
            <div className="h-16 bg-slate-50 rounded-lg animate-pulse" />
          ) : upcoming.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No upcoming jobs scheduled.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(j => (
                <Link key={j.id} to={`/JobDetail/${j.id}`} className="flex items-center gap-2 py-1 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1 group-hover:text-blue-600">{j.title}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {format(new Date(j.scheduled_start), "MMM d")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* Revenue */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Revenue Collected</p>
            <p className="text-lg font-bold text-slate-900 leading-tight">
              {loading ? "—" : `$${collected.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
            </p>
          </div>
          <Link to={createPageUrl("Reports")} className="text-slate-300 hover:text-blue-600">
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}