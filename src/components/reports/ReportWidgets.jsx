import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, ComposedChart, Scatter, ReferenceLine
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f43f5e", "#84cc16", "#f97316", "#a855f7"];

// ── Date parsing helper ───────────────────────────────────────────────────────
function parseDate(raw) {
  if (!raw) return null;
  const d = raw.length <= 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ── Data helpers ──────────────────────────────────────────────────────────────
export function revenueByMonth(invoices, months = 12) {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const paidInvs = invoices.filter(inv => {
      if (!["paid", "partial"].includes(inv.status)) return false;
      const d = parseDate(inv.paid_date);
      return d && d >= start && d <= end;
    });
    const revenue = paidInvs.reduce((s, inv) => s + (inv.amount_paid > 0 ? inv.amount_paid : (inv.total || 0)), 0);
    const count = paidInvs.length;
    return { month: format(month, "MMM yy"), revenue, count };
  });
}

export function jobsByStatus(jobs) {
  return ["new","scheduled","in_progress","completed","cancelled","on_hold"]
    .map(s => ({ name: s.replace(/_/g," "), value: jobs.filter(j => j.status === s).length }))
    .filter(d => d.value > 0);
}

export function leadsBySource(leads) {
  const sources = [...new Set(leads.map(l => l.source).filter(Boolean))];
  return sources
    .map(s => ({ name: s.replace(/_/g," "), value: leads.filter(l => l.source === s).length }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function leadsByStage(leads) {
  return ["new","contacted","qualified","proposal_sent","won","lost"]
    .map(s => ({ name: s.replace(/_/g," "), value: leads.filter(l => l.status === s).length }))
    .filter(d => d.value > 0);
}

export function newCustomersByMonth(customers, months = 12) {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const count = customers.filter(c => {
      const d = parseDate(c.created_date);
      return d && d >= start && d <= end;
    }).length;
    return { month: format(month, "MMM yy"), count };
  });
}

export function invoiceStatusBreakdown(invoices) {
  return ["draft","sent","viewed","paid","partial","overdue","void"]
    .map(s => ({ name: s, value: invoices.filter(i => i.status === s).length }))
    .filter(d => d.value > 0);
}

export function jobsPerTech(jobs, technicians) {
  return technicians.map(t => ({
    name: `${t.first_name} ${t.last_name}`.trim(),
    jobs: jobs.filter(j => j.assigned_techs?.includes(t.id)).length,
    completed: jobs.filter(j => j.assigned_techs?.includes(t.id) && j.status === "completed").length,
  })).filter(d => d.jobs > 0).sort((a,b) => b.jobs - a.jobs).slice(0, 10);
}

export function avgJobValueByMonth(jobs, months = 12) {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthJobs = jobs.filter(j => {
      const d = parseDate(j.scheduled_start || j.created_date);
      return d && d >= start && d <= end;
    });
    const avg = monthJobs.length > 0
      ? monthJobs.reduce((s, j) => s + (j.total_amount || 0), 0) / monthJobs.length : 0;
    return { month: format(month, "MMM yy"), avg: Math.round(avg), count: monthJobs.length };
  });
}

export function outstandingVsPaid(invoices) {
  const paid = invoices.filter(i => ["paid","partial"].includes(i.status))
    .reduce((s,i) => s + (i.amount_paid > 0 ? i.amount_paid : (i.total||0)), 0);
  const outstanding = invoices.filter(i => ["sent","viewed","overdue"].includes(i.status))
    .reduce((s,i) => s + ((i.total||0) - (i.amount_paid||0)), 0);
  return [{ name: "Collected", value: Math.round(paid) }, { name: "Outstanding", value: Math.round(outstanding) }].filter(d => d.value > 0);
}

export function topCustomersByRevenue(customers, invoices, limit = 8) {
  return customers.map(c => ({
    name: c.business_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown",
    revenue: invoices.filter(i => i.customer_id === c.id && ["paid","partial"].includes(i.status))
      .reduce((s,i) => s + (i.amount_paid > 0 ? i.amount_paid : (i.total||0)), 0),
    jobs: 0,
  })).filter(d => d.revenue > 0).sort((a,b) => b.revenue - a.revenue).slice(0, limit);
}

export function serviceTypeRevenue(jobs, invoices) {
  const types = [...new Set(jobs.map(j => j.service_type).filter(Boolean))];
  return types.map(type => {
    const jobIds = jobs.filter(j => j.service_type === type).map(j => j.id);
    const rev = invoices.filter(i => jobIds.includes(i.job_id) && ["paid","partial"].includes(i.status))
      .reduce((s,i) => s + (i.amount_paid > 0 ? i.amount_paid : (i.total||0)), 0);
    return { name: type, revenue: Math.round(rev) };
  }).filter(d => d.revenue > 0).sort((a,b) => b.revenue - a.revenue);
}

export function jobVolumeByMonth(jobs, months = 12) {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthJobs = jobs.filter(j => {
      const d = parseDate(j.created_date);
      return d && d >= start && d <= end;
    });
    return {
      month: format(month, "MMM yy"),
      total: monthJobs.length,
      completed: monthJobs.filter(j => j.status === "completed").length,
      cancelled: monthJobs.filter(j => j.status === "cancelled").length,
    };
  });
}

export function invoiceAgingBuckets(invoices) {
  const today = new Date();
  const outstanding = invoices.filter(i => ["sent","viewed","overdue"].includes(i.status));
  const buckets = [
    { name: "Current", min: 0, max: 30 },
    { name: "31–60 days", min: 31, max: 60 },
    { name: "61–90 days", min: 61, max: 90 },
    { name: "90+ days", min: 91, max: Infinity },
  ];
  return buckets.map(b => ({
    name: b.name,
    value: outstanding.filter(i => {
      const due = parseDate(i.due_date || i.created_date);
      if (!due) return false;
      const age = differenceInDays(today, due);
      return age >= b.min && age <= b.max;
    }).reduce((s, i) => s + ((i.total||0) - (i.amount_paid||0)), 0),
  })).filter(d => d.value > 0);
}

export function revenueVsJobCount(invoices, jobs, months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const rev = invoices.filter(inv => {
      if (!["paid","partial"].includes(inv.status)) return false;
      const d = parseDate(inv.paid_date);
      return d && d >= start && d <= end;
    }).reduce((s, inv) => s + (inv.amount_paid > 0 ? inv.amount_paid : (inv.total||0)), 0);
    const jobCount = jobs.filter(j => {
      const d = parseDate(j.created_date);
      return d && d >= start && d <= end;
    }).length;
    return { month: format(month, "MMM yy"), revenue: Math.round(rev), jobs: jobCount };
  });
}

export function repeatVsNewCustomers(customers, invoices) {
  const repeat = customers.filter(c =>
    invoices.filter(i => i.customer_id === c.id && ["paid","partial"].includes(i.status)).length > 1
  ).length;
  const newOnes = customers.length - repeat;
  return [
    { name: "Repeat", value: repeat },
    { name: "One-time", value: newOnes },
  ].filter(d => d.value > 0);
}

export function collectionEfficiency(invoices, months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthInvs = invoices.filter(inv => {
      const d = parseDate(inv.created_date);
      return d && d >= start && d <= end;
    });
    const billed = monthInvs.reduce((s,i) => s+(i.total||0), 0);
    const collected = monthInvs.filter(i => ["paid","partial"].includes(i.status))
      .reduce((s,i) => s+(i.amount_paid > 0 ? i.amount_paid : (i.total||0)), 0);
    const rate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
    return { month: format(month, "MMM yy"), billed: Math.round(billed), collected: Math.round(collected), rate };
  });
}

// ── Chart Components ──────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No data available</div>
);

export function RevenueBarChart({ invoices }) {
  const data = revenueByMonth(invoices, 12);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Monthly Revenue (12 Months)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
            <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, "Revenue"]} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RevenueAreaChart({ invoices }) {
  const data = revenueByMonth(invoices, 12);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Revenue Trend (12 Months)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
            <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, "Revenue"]} />
            <Area dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function JobStatusPieChart({ jobs }) {
  const data = jobsByStatus(jobs);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Jobs by Status</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function LeadSourceChart({ leads }) {
  const data = leadsBySource(leads);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Leads by Source</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <div className="space-y-2.5 pt-2">
            {data.map(({ name, value }, i) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-sm text-slate-600 capitalize flex-1">{name}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="h-full rounded-full" style={{ width: `${(value/data[0].value)*100}%`, backgroundColor: COLORS[i%COLORS.length] }} />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-6 text-right">{value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LeadFunnelChart({ leads }) {
  const data = leadsByStage(leads);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Lead Pipeline Funnel</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} width={90} />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function NewCustomersChart({ customers }) {
  const data = newCustomersByMonth(customers, 12);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">New Customers per Month</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function InvoiceStatusChart({ invoices }) {
  const data = invoiceStatusBreakdown(invoices);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Invoice Status Breakdown</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function AvgJobValueChart({ jobs }) {
  const data = avgJobValueByMonth(jobs, 12);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Avg Job Value per Month</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={v => [`$${v}`, "Avg Value"]} />
            <Line dataKey="avg" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function OutstandingVsPaidChart({ invoices }) {
  const data = outstandingVsPaid(invoices);
  const PAIR = ["#10b981", "#ef4444"];
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Collected vs Outstanding</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {data.map((_, i) => <Cell key={i} fill={PAIR[i%PAIR.length]} />)}
              </Pie>
              <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function TopCustomersChart({ customers, invoices }) {
  const data = topCustomersByRevenue(customers, invoices);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Top Customers by Revenue</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} width={90} />
              <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#06b6d4" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function JobsPerTechChart({ jobs, technicians }) {
  const data = jobsPerTech(jobs, technicians);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Jobs per Technician</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} width={90} />
              <Tooltip />
              <Legend />
              <Bar dataKey="jobs" name="Total" fill="#f43f5e" radius={[0,4,4,0]} />
              <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function ServiceTypeRevenueChart({ jobs, invoices }) {
  const data = serviceTypeRevenue(jobs, invoices);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Revenue by Service Type</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} width={100} />
              <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#a855f7" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function JobVolumeChart({ jobs }) {
  const data = jobVolumeByMonth(jobs, 12);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Job Volume by Month</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4,4,0,0]} />
            <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4,4,0,0]} />
            <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function InvoiceAgingChart({ invoices }) {
  const data = invoiceAgingBuckets(invoices);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Accounts Receivable Aging</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, "Outstanding"]} />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {data.map((_, i) => <Cell key={i} fill={["#10b981","#f59e0b","#f97316","#ef4444"][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueVsJobsChart({ jobs, invoices }) {
  const data = revenueVsJobCount(invoices, jobs, 6);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Revenue vs Job Count</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="jobs" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.8} />
            <Line yAxisId="jobs" dataKey="jobs" name="Jobs" stroke="#f59e0b" strokeWidth={2} dot={true} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RepeatVsNewCustomersChart({ customers, invoices }) {
  const data = repeatVsNewCustomers(customers, invoices);
  const PAIR = ["#3b82f6", "#94a3b8"];
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Repeat vs New Customers</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {data.map((_, i) => <Cell key={i} fill={PAIR[i%PAIR.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function CollectionEfficiencyChart({ invoices }) {
  const data = collectionEfficiency(invoices, 6);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Collection Efficiency (%)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis yAxisId="amt" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `${v}%`} domain={[0,100]} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="amt" dataKey="billed" name="Billed" fill="#e2e8f0" radius={[4,4,0,0]} />
            <Bar yAxisId="amt" dataKey="collected" name="Collected" fill="#10b981" radius={[4,4,0,0]} />
            <Line yAxisId="pct" dataKey="rate" name="Rate %" stroke="#3b82f6" strokeWidth={2} dot={true} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Widget registry ───────────────────────────────────────────────────────────
export const WIDGET_CATEGORIES = [
  {
    label: "💰 Revenue",
    widgets: [
      { type: "revenue_bar", label: "Monthly Revenue (Bar)" },
      { type: "revenue_area", label: "Revenue Trend (Area)" },
      { type: "revenue_vs_jobs", label: "Revenue vs Job Count" },
      { type: "collection_efficiency", label: "Collection Efficiency" },
      { type: "outstanding_paid", label: "Collected vs Outstanding" },
    ]
  },
  {
    label: "🧾 Invoices",
    widgets: [
      { type: "invoice_status", label: "Invoice Status Breakdown" },
      { type: "invoice_aging", label: "Accounts Receivable Aging" },
    ]
  },
  {
    label: "🔧 Jobs",
    widgets: [
      { type: "job_status", label: "Jobs by Status" },
      { type: "job_volume", label: "Job Volume by Month" },
      { type: "avg_job_value", label: "Avg Job Value per Month" },
      { type: "service_type_revenue", label: "Revenue by Service Type" },
    ]
  },
  {
    label: "👥 Customers",
    widgets: [
      { type: "new_customers", label: "New Customers per Month" },
      { type: "top_customers", label: "Top Customers by Revenue" },
      { type: "repeat_vs_new", label: "Repeat vs New Customers" },
    ]
  },
  {
    label: "📣 Leads",
    widgets: [
      { type: "lead_source", label: "Leads by Source" },
      { type: "lead_funnel", label: "Lead Pipeline Funnel" },
    ]
  },
  {
    label: "🛠 Team",
    widgets: [
      { type: "jobs_per_tech", label: "Jobs per Technician" },
    ]
  },
];

export const ALL_WIDGETS = WIDGET_CATEGORIES.flatMap(c => c.widgets);

export function WidgetRenderer({ type, data }) {
  const { jobs, invoices, customers, leads, technicians } = data;
  switch (type) {
    case "revenue_bar": return <RevenueBarChart invoices={invoices} />;
    case "revenue_area": return <RevenueAreaChart invoices={invoices} />;
    case "revenue_vs_jobs": return <RevenueVsJobsChart jobs={jobs} invoices={invoices} />;
    case "collection_efficiency": return <CollectionEfficiencyChart invoices={invoices} />;
    case "outstanding_paid": return <OutstandingVsPaidChart invoices={invoices} />;
    case "invoice_status": return <InvoiceStatusChart invoices={invoices} />;
    case "invoice_aging": return <InvoiceAgingChart invoices={invoices} />;
    case "job_status": return <JobStatusPieChart jobs={jobs} />;
    case "job_volume": return <JobVolumeChart jobs={jobs} />;
    case "avg_job_value": return <AvgJobValueChart jobs={jobs} />;
    case "service_type_revenue": return <ServiceTypeRevenueChart jobs={jobs} invoices={invoices} />;
    case "new_customers": return <NewCustomersChart customers={customers} />;
    case "top_customers": return <TopCustomersChart customers={customers} invoices={invoices} />;
    case "repeat_vs_new": return <RepeatVsNewCustomersChart customers={customers} invoices={invoices} />;
    case "lead_source": return <LeadSourceChart leads={leads} />;
    case "lead_funnel": return <LeadFunnelChart leads={leads} />;
    case "jobs_per_tech": return <JobsPerTechChart jobs={jobs} technicians={technicians} />;
    default: return null;
  }
}