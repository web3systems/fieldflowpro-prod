import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { BarChart3, TrendingUp, DollarSign, Users, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Reports() {
  const { activeCompany } = useApp();
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [j, inv, c, l] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Lead.filter({ company_id: activeCompany.id }),
    ]);
    setJobs(j);
    setInvoices(inv);
    setCustomers(c);
    setLeads(l);
    setLoading(false);
  }

  // Revenue by month (last 6 months)
  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const revenue = invoices
      .filter(inv => inv.status === "paid" && inv.paid_date &&
        new Date(inv.paid_date) >= start && new Date(inv.paid_date) <= end)
      .reduce((s, inv) => s + (inv.total || 0), 0);
    return { month: format(month, "MMM"), revenue };
  });

  // Jobs by status
  const jobsByStatus = ["new", "scheduled", "in_progress", "completed", "cancelled"].map(status => ({
    name: status.replace("_", " "),
    value: jobs.filter(j => j.status === status).length
  })).filter(d => d.value > 0);

  // Leads by source
  const leadsBySource = ["website", "referral", "google", "facebook", "instagram", "other"].map(source => ({
    name: source,
    value: leads.filter(l => l.source === source).length
  })).filter(d => d.value > 0);

  // Key metrics
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const avgJobValue = jobs.length > 0 ? jobs.reduce((s, j) => s + (j.total_amount || 0), 0) / jobs.length : 0;
  const completionRate = jobs.length > 0 ? (jobs.filter(j => j.status === "completed").length / jobs.length * 100) : 0;
  const leadConversionRate = leads.length > 0 ? (leads.filter(l => l.status === "won").length / leads.length * 100) : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">{activeCompany?.name} performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg Job Value", value: `$${avgJobValue.toFixed(0)}`, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completion Rate", value: `${completionRate.toFixed(0)}%`, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Lead Conversion", value: `${leadConversionRate.toFixed(0)}%`, icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">Revenue (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Jobs by Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {jobsByStatus.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No job data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={jobsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {jobsByStatus.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsBySource.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No lead data yet</div>
            ) : (
              <div className="space-y-3 pt-2">
                {leadsBySource.map(({ name, value }, i) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-slate-600 capitalize flex-1">{name.replace("_", " ")}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(value / Math.max(...leadsBySource.map(l => l.value))) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length]
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-6 text-right">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">Quick Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Total Jobs", value: jobs.length },
                { label: "Completed Jobs", value: jobs.filter(j => j.status === "completed").length },
                { label: "Active Customers", value: customers.filter(c => c.status === "active").length },
                { label: "Total Leads", value: leads.length },
                { label: "Won Leads", value: leads.filter(l => l.status === "won").length },
                { label: "Pending Invoices", value: invoices.filter(i => ["sent", "viewed"].includes(i.status)).length },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="text-sm font-bold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}