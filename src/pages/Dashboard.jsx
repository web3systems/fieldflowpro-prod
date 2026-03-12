import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Briefcase, Users, DollarSign, TrendingUp,
  Clock, CheckCircle, AlertCircle, Plus,
  ArrowRight, Calendar, Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import OnboardingBanner from "../components/dashboard/OnboardingBanner";

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  scheduled: "bg-purple-100 text-purple-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const { activeCompany, user: appUser } = useApp();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [myTech, setMyTech] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  async function loadData() {
    setLoading(true);
    const [j, c, inv, l] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.Lead.filter({ company_id: activeCompany.id }),
    ]);
    setJobs(j);
    setCustomers(c);
    setInvoices(inv);
    setLeads(l);
    // Find if current user is a technician
    const techs = await base44.entities.Technician.filter({ company_id: activeCompany.id });
    const me = await base44.auth.me();
    const myT = techs.find(t => t.email === me?.email);
    setMyTech(myT || null);
    setLoading(false);
  }

  const myJobs = myTech ? jobs.filter(j => j.assigned_techs?.includes(myTech.id) && ["new","scheduled","in_progress"].includes(j.status)) : [];
  const activeJobs = jobs.filter(j => ["in_progress", "scheduled", "new"].includes(j.status));
  const todayJobs = jobs.filter(j => {
    if (!j.scheduled_start) return false;
    return format(new Date(j.scheduled_start), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  });
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const pendingRevenue = invoices.filter(i => ["sent", "viewed", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
  const newLeads = leads.filter(l => l.status === "new").length;

  const stats = [
    {
      label: "Active Jobs",
      value: activeJobs.length,
      icon: Briefcase,
      color: "text-blue-600",
      bg: "bg-blue-50",
      sub: `${todayJobs.length} today`
    },
    {
      label: "Total Customers",
      value: customers.length,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      sub: "All time"
    },
    {
      label: "Revenue Collected",
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-violet-600",
      bg: "bg-violet-50",
      sub: `$${pendingRevenue.toLocaleString()} pending`
    },
    {
      label: "New Leads",
      value: newLeads,
      icon: TrendingUp,
      color: "text-orange-600",
      bg: "bg-orange-50",
      sub: `${leads.length} total`
    },
  ];

  if (!activeCompany) {
    return (
      <div className="p-8 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No company selected. Please go to Companies to set one up.</p>
        <Link to={createPageUrl("Companies")}>
          <Button className="mt-4">Manage Companies</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{activeCompany?.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link to={createPageUrl("Customers")}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Customer
            </Button>
          </Link>
          <Link to={createPageUrl("Estimates")}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Estimate
            </Button>
          </Link>
          <Link to={createPageUrl("Invoices")}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Invoice
            </Button>
          </Link>
          <Link to={createPageUrl("Jobs")}>
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> New Job
            </Button>
          </Link>
        </div>
      </div>

      <OnboardingBanner company={activeCompany} customers={customers} jobs={jobs} />

      {/* My Jobs (for technicians) */}
      {myTech && myJobs.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="px-4 py-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-500" />
              My Assigned Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {myJobs.map(job => {
                const cust = customers.find(c => c.id === job.customer_id);
                return (
                  <Link key={job.id} to={createPageUrl("Jobs")} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {cust && <span className="text-xs text-slate-400">{cust.first_name} {cust.last_name}</span>}
                        {job.scheduled_start && <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(job.scheduled_start), "MMM d · h:mm a")}</span>}
                        {job.address && (
                          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" /> Directions
                          </a>
                        )}
                      </div>
                    </div>
                    <Badge className={`text-xs ${statusColors[job.status] || "bg-gray-100 text-gray-600"}`}>{job.status?.replace("_", " ")}</Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{loading ? "—" : value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              <div className="text-xs text-slate-400 mt-1">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Jobs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="px-4 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Today's Schedule
              </CardTitle>
              <Link to={createPageUrl("Jobs")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : todayJobs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No jobs scheduled for today</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayJobs.slice(0, 5).map(job => (
                  <Link
                    key={job.id}
                    to={createPageUrl(`Jobs`)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {job.scheduled_start ? format(new Date(job.scheduled_start), "h:mm a") : "No time set"}
                      </p>
                    </div>
                    <Badge className={`text-xs ${statusColors[job.status] || "bg-gray-100 text-gray-600"}`}>
                      {job.status?.replace("_", " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="px-4 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" />
                Recent Activity
              </CardTitle>
              <Link to={createPageUrl("Jobs")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No jobs yet</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {jobs.slice(0, 5).map(job => (
                  <div key={job.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      job.status === "completed" ? "bg-green-100" : job.status === "in_progress" ? "bg-amber-100" : "bg-blue-100"
                    }`}>
                      {job.status === "completed"
                        ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        : job.status === "cancelled"
                        ? <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        : <Clock className="w-3.5 h-3.5 text-blue-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
                      <p className="text-xs text-slate-400">
                        {job.created_date ? format(new Date(job.created_date), "MMM d") : ""}
                      </p>
                    </div>
                    <Badge className={`text-xs ${statusColors[job.status] || "bg-gray-100 text-gray-600"}`}>
                      {job.status?.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}