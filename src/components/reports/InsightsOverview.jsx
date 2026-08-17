import { UserPlus, Inbox, FileCheck, Briefcase, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { differenceInCalendarMonths, format, parseISO } from "date-fns";

// Overview row of key metrics with month-over-month % change indicators.
export default function InsightsOverview({ leads, bookings, estimates, jobs, invoices }) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const inThisMonth = (raw) => {
    if (!raw) return false;
    const d = typeof raw === "string" ? parseISO(raw) : new Date(raw);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  };
  const inLastMonth = (raw) => {
    if (!raw) return false;
    const d = typeof raw === "string" ? parseISO(raw) : new Date(raw);
    return differenceInCalendarMonths(now, d) === 1;
  };

  const newLeadsThis = leads.filter(l => inThisMonth(l.created_date)).length;
  const newLeadsLast = leads.filter(l => inLastMonth(l.created_date)).length;
  const newRequestsThis = bookings.filter(b => inThisMonth(b.created_date)).length;
  const newRequestsLast = bookings.filter(b => inLastMonth(b.created_date)).length;
  const convertedQuotesThis = estimates.filter(e => e.status === "approved" && inThisMonth(e.updated_date)).length;
  const convertedQuotesLast = estimates.filter(e => e.status === "approved" && inLastMonth(e.updated_date)).length;
  const newJobsThis = jobs.filter(j => inThisMonth(j.created_date)).length;
  const newJobsLast = jobs.filter(j => inLastMonth(j.created_date)).length;
  const invoicedThis = invoices.filter(i => inThisMonth(i.created_date)).reduce((s, i) => s + (i.total || 0), 0);
  const invoicedLast = invoices.filter(i => inLastMonth(i.created_date)).reduce((s, i) => s + (i.total || 0), 0);

  const pct = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const metrics = [
    { label: "New Leads", value: newLeadsThis, change: pct(newLeadsThis, newLeadsLast), icon: UserPlus, accent: "text-pink-600", bg: "bg-pink-50" },
    { label: "New Requests", value: newRequestsThis, change: pct(newRequestsThis, newRequestsLast), icon: Inbox, accent: "text-sky-600", bg: "bg-sky-50" },
    { label: "Converted Quotes", value: convertedQuotesThis, change: pct(convertedQuotesThis, convertedQuotesLast), icon: FileCheck, accent: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "New Jobs", value: newJobsThis, change: pct(newJobsThis, newJobsLast), icon: Briefcase, accent: "text-blue-600", bg: "bg-blue-50" },
    { label: "Invoiced Value", value: `$${invoicedThis.toLocaleString()}`, change: pct(invoicedThis, invoicedLast), icon: DollarSign, accent: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {metrics.map(m => (
        <Card key={m.label} className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center mb-2`}>
              <m.icon className={`w-4 h-4 ${m.accent}`} />
            </div>
            <p className="text-xl font-bold text-slate-900 leading-tight">{m.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
            {m.change !== 0 && (
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${m.change > 0 ? "text-blue-600" : "text-red-500"}`}>
                {m.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(m.change)}% vs last month
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}