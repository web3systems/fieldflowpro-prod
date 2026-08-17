import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Inbox, FileText, Briefcase, DollarSign } from "lucide-react";

const STATUS_ACTIVE = new Set([
  "pending", "draft", "sent", "viewed", "new", "scheduled", "in_progress", "estimated", "partial", "overdue",
]);

const statusBadge = (status) => {
  const s = String(status || "").toLowerCase();
  if (["paid", "completed", "approved", "won", "confirmed", "converted"].includes(s)) return "bg-blue-100 text-blue-700";
  if (["overdue", "cancelled", "declined", "void", "lost"].includes(s)) return "bg-red-100 text-red-700";
  if (["pending", "draft"].includes(s)) return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-700";
};

// Unified work overview: Requests / Quotes / Jobs / Invoices in one table with Active/All filter.
export default function WorkOverview({ customer, bookings, estimates, jobs, invoices }) {
  const [filter, setFilter] = useState("active");

  const rows = [
    ...bookings.map(b => ({
      type: "Request", icon: Inbox, id: b.id, title: b.service_type || "Service request",
      date: b.created_date, status: b.status, amount: 0, link: "/Schedule",
    })),
    ...estimates.map(e => ({
      type: "Quote", icon: FileText, id: e.id, title: e.title || "Estimate",
      date: e.updated_date || e.created_date, status: e.status, amount: e.total || 0, link: `/EstimateDetail/${e.id}`,
    })),
    ...jobs.map(j => ({
      type: "Job", icon: Briefcase, id: j.id, title: j.title || "Job",
      date: j.scheduled_start || j.updated_date || j.created_date, status: j.status, amount: j.total_amount || 0, link: `/JobDetail/${j.id}`,
    })),
    ...invoices.map(i => ({
      type: "Invoice", icon: DollarSign, id: i.id, title: i.invoice_number || i.subject || "Invoice",
      date: i.due_date || i.created_date, status: i.status, amount: i.total || 0, link: `/InvoiceDetail/${i.id}`,
    })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const filtered = filter === "active"
    ? rows.filter(r => STATUS_ACTIVE.has(String(r.status).toLowerCase()))
    : rows;

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800">Work Overview</CardTitle>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <Button
              size="sm"
              variant={filter === "active" ? "default" : "ghost"}
              onClick={() => setFilter("active")}
              className="h-7 text-xs px-3"
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "ghost"}
              onClick={() => setFilter("all")}
              className="h-7 text-xs px-3"
            >
              All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No work records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100">
              <div className="col-span-5">Item</div>
              <div className="col-span-3">Date</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            <div className="divide-y divide-slate-50">
              {filtered.map(r => (
                <Link key={`${r.type}-${r.id}`} to={r.link} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50 transition-colors">
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <r.icon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                      <p className="text-xs text-slate-400">{r.type}</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-xs text-slate-500">
                    {r.date ? format(new Date(r.date), "MMM d, yyyy") : "—"}
                  </div>
                  <div className="col-span-2">
                    <Badge className={`text-xs ${statusBadge(r.status)}`}>{String(r.status || "—").replace("_", " ")}</Badge>
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-slate-800">
                    {r.amount > 0 ? `$${r.amount.toLocaleString()}` : "—"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}