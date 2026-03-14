import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from "date-fns";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f43f5e", "#84cc16"];

// ── helpers ──────────────────────────────────────────────────────────────────
export function revenueByMonth(invoices, months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const revenue = invoices
      .filter(inv => inv.status === "paid" && inv.paid_date &&
        new Date(inv.paid_date) >= start && new Date(inv.paid_date) <= end)
      .reduce((s, inv) => s + (inv.total || 0), 0);
    return { month: format(month, "MMM yy"), revenue };
  });
}

export function jobsByStatus(jobs) {
  return ["new","scheduled","in_progress","completed","cancelled","on_hold"]
    .map(s => ({ name: s.replace(/_/g," "), value: jobs.filter(j => j.status === s).length }))
    .filter(d => d.value > 0);
}

export function leadsBySource(leads) {
  return ["website","referral","google","facebook","instagram","yelp","door_hanger","postcard","other"]
    .map(s => ({ name: s.replace(/_/g," "), value: leads.filter(l => l.source === s).length }))
    .filter(d => d.value > 0);
}

export function leadsByStage(leads) {
  return ["new","contacted","qualified","proposal_sent","won","lost"]
    .map(s => ({ name: s.replace(/_/g," "), value: leads.filter(l => l.status === s).length }))
    .filter(d => d.value > 0);
}

export function newCustomersByMonth(customers, months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const count = customers.filter(c =>
      c.created_date && new Date(c.created_date) >= start && new Date(c.created_date) <= end
    ).length;
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
  })).filter(d => d.jobs > 0).sort((a,b) => b.jobs - a.jobs).slice(0, 10);
}

export function avgJobValueByMonth(jobs, months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthJobs = jobs.filter(j =>
      j.scheduled_start && new Date(j.scheduled_start) >= start && new Date(j.scheduled_start) <= end
    );
    const avg = monthJobs.length > 0
      ? monthJobs.reduce((s, j) => s + (j.total_amount || 0), 0) / monthJobs.length : 0;
    return { month: format(month, "MMM yy"), avg: Math.round(avg) };
  });
}

export function outstandingVsPaid(invoices) {
  const paid = invoices.filter(i => i.status === "paid").reduce((s,i) => s+(i.total||0), 0);
  const outstanding = invoices.filter(i => ["sent","viewed","partial","overdue"].includes(i.status))
    .reduce((s,i) => s+(i.total||0), 0);
  return [{ name: "Paid", value: paid }, { name: "Outstanding", value: outstanding }].filter(d => d.value > 0);
}

export function topCustomersByRevenue(customers, invoices, limit = 8) {
  return customers.map(c => ({
    name: `${c.first_name} ${c.last_name}`.trim(),
    revenue: invoices.filter(i => i.customer_id === c.id && i.status === "paid")
      .reduce((s,i) => s+(i.total||0), 0),
  })).filter(d => d.revenue > 0).sort((a,b) => b.revenue - a.revenue).slice(0, limit);
}

// ── Chart components ──────────────────────────────────────────────────────────
export function RevenueBarChart({ invoices }) {
  const data = revenueByMonth(invoices, 12);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Revenue (12 Months)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Revenue"]} />
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
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Revenue Trend</CardTitle></CardHeader>
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
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Revenue"]} />
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
        {data.length === 0 ? <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No data</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
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
        {data.length === 0 ? <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No data</div> : (
          <div className="space-y-2.5 pt-2">
            {data.map(({ name, value }, i) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-sm text-slate-600 capitalize flex-1">{name}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="h-full rounded-full" style={{ width: `${(value/Math.max(...data.map(d=>d.value)))*100}%`, backgroundColor: COLORS[i%COLORS.length] }} />
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
        {data.length === 0 ? <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No data</div> : (
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
        {data.length === 0 ? <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No data</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
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
  const PAIR_COLORS = ["#10b981", "#ef4444"];
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Paid vs Outstanding</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No data</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {data.map((_, i) => <Cell key={i} fill={PAIR_COLORS[i%PAIR_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => [`$${v.toLocaleString()}`]} />
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
        {data.length === 0 ? <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No data</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} width={90} />
              <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Revenue"]} />
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
        {data.length === 0 ? <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No data</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} width={90} />
              <Tooltip />
              <Bar dataKey="jobs" fill="#f43f5e" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// Widget registry
export const ALL_WIDGETS = [
  { type: "revenue_bar", label: "Revenue Bar Chart" },
  { type: "revenue_area", label: "Revenue Trend" },
  { type: "job_status", label: "Jobs by Status" },
  { type: "lead_source", label: "Leads by Source" },
  { type: "lead_funnel", label: "Lead Pipeline Funnel" },
  { type: "new_customers", label: "New Customers per Month" },
  { type: "invoice_status", label: "Invoice Status Breakdown" },
  { type: "avg_job_value", label: "Avg Job Value" },
  { type: "outstanding_paid", label: "Paid vs Outstanding" },
  { type: "top_customers", label: "Top Customers by Revenue" },
  { type: "jobs_per_tech", label: "Jobs per Technician" },
];

export function WidgetRenderer({ type, data }) {
  const { jobs, invoices, customers, leads, technicians } = data;
  switch (type) {
    case "revenue_bar": return <RevenueBarChart invoices={invoices} />;
    case "revenue_area": return <RevenueAreaChart invoices={invoices} />;
    case "job_status": return <JobStatusPieChart jobs={jobs} />;
    case "lead_source": return <LeadSourceChart leads={leads} />;
    case "lead_funnel": return <LeadFunnelChart leads={leads} />;
    case "new_customers": return <NewCustomersChart customers={customers} />;
    case "invoice_status": return <InvoiceStatusChart invoices={invoices} />;
    case "avg_job_value": return <AvgJobValueChart jobs={jobs} />;
    case "outstanding_paid": return <OutstandingVsPaidChart invoices={invoices} />;
    case "top_customers": return <TopCustomersChart customers={customers} invoices={invoices} />;
    case "jobs_per_tech": return <JobsPerTechChart jobs={jobs} technicians={technicians} />;
    default: return null;
  }
}