import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AppContext } from "../Layout";
import { useContext } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Briefcase, TrendingUp, Users, FileText, UserPlus, BarChart3, CheckCircle, Clock, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RevenueBarChart, RevenueAreaChart, JobStatusPieChart, LeadSourceChart,
  LeadFunnelChart, NewCustomersChart, InvoiceStatusChart, AvgJobValueChart,
  OutstandingVsPaidChart, TopCustomersChart, JobsPerTechChart,
  ServiceTypeRevenueChart, JobVolumeChart, InvoiceAgingChart,
  RevenueVsJobsChart, RepeatVsNewCustomersChart, CollectionEfficiencyChart,
} from "@/components/reports/ReportWidgets";
import CustomDashboardBuilder from "@/components/reports/CustomDashboardBuilder";
import InsightsOverview from "@/components/reports/InsightsOverview";
import RevenueBySourceDonut from "@/components/reports/RevenueBySourceDonut";
import RevenueHeatmap from "@/components/reports/RevenueHeatmap";
import { differenceInDays } from "date-fns";

function parseDate(raw) {
  if (!raw) return null;
  const d = raw.length <= 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export default function Reports() {
  // Works in both tenant layout (AppContext present) and Admin Console (no context)
  const appCtx = useContext(AppContext);
  const [allCompanies, setAllCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Determine if we're in admin mode (no AppContext)
  const isAdminMode = !appCtx?.activeCompany;
  const activeCompany = isAdminMode
    ? allCompanies.find(c => c.id === selectedCompanyId) || null
    : appCtx.activeCompany;

  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load company list for admin picker
  useEffect(() => {
    if (!isAdminMode) return;
    base44.entities.Company.filter({ is_active: true }, "name", 200)
      .then(list => {
        const masters = list.filter(c => !c.parent_company_id);
        setAllCompanies(masters);
        if (masters.length > 0) setSelectedCompanyId(masters[0].id);
      })
      .catch(() => {});
  }, [isAdminMode]);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany?.id]);

  async function loadData() {
    setLoading(true);
    const [j, inv, c, l, t, est, bk] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Lead.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
      base44.entities.Estimate.filter({ company_id: activeCompany.id }),
      base44.entities.ServiceBooking.filter({ company_id: activeCompany.id }),
    ]);
    setJobs(j); setInvoices(inv); setCustomers(c); setLeads(l); setTechnicians(t);
    setEstimates(est); setBookings(bk);
    setLoading(false);
  }

  const paidInvoices = invoices.filter(i => ["paid", "partial"].includes(i.status));
  const totalRevenue = paidInvoices.reduce((s, i) => s + (i.amount_paid > 0 ? i.amount_paid : (i.total || 0)), 0);
  const outstandingRevenue = invoices.filter(i => ["sent","viewed","overdue"].includes(i.status))
    .reduce((s, i) => s + ((i.total||0) - (i.amount_paid||0)), 0);
  const avgJobValue = jobs.filter(j => j.total_amount > 0).length > 0
    ? jobs.filter(j => j.total_amount > 0).reduce((s, j) => s + (j.total_amount || 0), 0) / jobs.filter(j => j.total_amount > 0).length
    : 0;
  const completionRate = jobs.length > 0 ? (jobs.filter(j => j.status === "completed").length / jobs.length * 100) : 0;
  const leadConversionRate = leads.length > 0 ? (leads.filter(l => l.status === "won").length / leads.length * 100) : 0;
  const activeCustomers = customers.filter(c => c.status === "active").length;
  const overdueCount = invoices.filter(i => i.status === "overdue").length;
  const todayJobs = jobs.filter(j => {
    if (!j.scheduled_start) return false;
    return Math.abs(differenceInDays(parseDate(j.scheduled_start) || new Date(), new Date())) === 0;
  }).length;
  const collectionRate = (totalRevenue + outstandingRevenue) > 0
    ? Math.round((totalRevenue / (totalRevenue + outstandingRevenue)) * 100)
    : 0;

  const reportData = { jobs, invoices, customers, leads, technicians };

  const kpis = [
    { label: "Total Collected", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Outstanding", value: `$${outstandingRevenue.toLocaleString()}`, icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Avg Job Value", value: `$${avgJobValue.toFixed(0)}`, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Collection Rate", value: `${collectionRate}%`, icon: CheckCircle, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Job Completion", value: `${completionRate.toFixed(0)}%`, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Lead Conversion", value: `${leadConversionRate.toFixed(0)}%`, icon: UserPlus, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Active Customers", value: activeCustomers, icon: Users, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Overdue Invoices", value: overdueCount, icon: Clock, color: "text-red-600", bg: "bg-red-50" },
  ];

  if (isAdminMode && allCompanies.length === 0) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">{activeCompany?.name} — business insights</p>
        </div>
        {isAdminMode && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <Select value={selectedCompanyId || ""} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-56 h-9 text-sm">
                <SelectValue placeholder="Select company..." />
              </SelectTrigger>
              <SelectContent>
                {allCompanies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Insights Overview — key metrics with % change */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">This Month at a Glance</h2>
        <InsightsOverview leads={leads} bookings={bookings} estimates={estimates} jobs={jobs} invoices={invoices} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="custom">
            <BarChart3 className="w-3.5 h-3.5 mr-1" />
            Custom
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Revenue chart section */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Revenue</h2>
            <RevenueAreaChart invoices={invoices} />
          </div>
          {/* Donut + Heatmap */}
          <div className="grid lg:grid-cols-2 gap-6">
            <RevenueBySourceDonut leads={leads} customers={customers} invoices={invoices} />
            <RevenueHeatmap jobs={jobs} invoices={invoices} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <OutstandingVsPaidChart invoices={invoices} />
            <JobStatusPieChart jobs={jobs} />
            <RevenueVsJobsChart jobs={jobs} invoices={invoices} />
            <TopCustomersChart customers={customers} invoices={invoices} />
          </div>
        </TabsContent>

        {/* REVENUE */}
        <TabsContent value="revenue" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <RevenueBarChart invoices={invoices} />
            <RevenueAreaChart invoices={invoices} />
            <CollectionEfficiencyChart invoices={invoices} />
            <OutstandingVsPaidChart invoices={invoices} />
            <ServiceTypeRevenueChart jobs={jobs} invoices={invoices} />
            <RevenueVsJobsChart jobs={jobs} invoices={invoices} />
            <TopCustomersChart customers={customers} invoices={invoices} />
          </div>
        </TabsContent>

        {/* JOBS */}
        <TabsContent value="jobs" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <JobVolumeChart jobs={jobs} />
            <JobStatusPieChart jobs={jobs} />
            <AvgJobValueChart jobs={jobs} />
            <ServiceTypeRevenueChart jobs={jobs} invoices={invoices} />
            <JobsPerTechChart jobs={jobs} technicians={technicians} />
          </div>
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <InvoiceAgingChart invoices={invoices} />
            <OutstandingVsPaidChart invoices={invoices} />
            <InvoiceStatusChart invoices={invoices} />
            <CollectionEfficiencyChart invoices={invoices} />
            <RevenueBarChart invoices={invoices} />
          </div>
        </TabsContent>

        {/* CUSTOMERS */}
        <TabsContent value="customers" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <NewCustomersChart customers={customers} />
            <RepeatVsNewCustomersChart customers={customers} invoices={invoices} />
            <TopCustomersChart customers={customers} invoices={invoices} />
          </div>
        </TabsContent>

        {/* LEADS */}
        <TabsContent value="leads" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <LeadSourceChart leads={leads} />
            <LeadFunnelChart leads={leads} />
          </div>
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <JobsPerTechChart jobs={jobs} technicians={technicians} />
            <AvgJobValueChart jobs={jobs} />
          </div>
        </TabsContent>

        {/* CUSTOM DASHBOARDS */}
        <TabsContent value="custom" className="mt-4">
          <CustomDashboardBuilder companyId={activeCompany?.id} data={reportData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}