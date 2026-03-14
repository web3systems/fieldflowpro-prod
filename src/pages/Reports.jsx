import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Briefcase, TrendingUp, Users, FileText, UserPlus } from "lucide-react";
import {
  RevenueBarChart, RevenueAreaChart, JobStatusPieChart, LeadSourceChart,
  LeadFunnelChart, NewCustomersChart, InvoiceStatusChart, AvgJobValueChart,
  OutstandingVsPaidChart, TopCustomersChart, JobsPerTechChart
} from "@/components/reports/ReportWidgets";
import CustomDashboardBuilder from "@/components/reports/CustomDashboardBuilder";

export default function Reports() {
  const { activeCompany } = useApp();
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [j, inv, c, l, t] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Lead.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
    ]);
    setJobs(j); setInvoices(inv); setCustomers(c); setLeads(l); setTechnicians(t);
    setLoading(false);
  }

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const outstandingRevenue = invoices.filter(i => ["sent","viewed","partial","overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
  const avgJobValue = jobs.length > 0 ? jobs.reduce((s, j) => s + (j.total_amount || 0), 0) / jobs.length : 0;
  const completionRate = jobs.length > 0 ? (jobs.filter(j => j.status === "completed").length / jobs.length * 100) : 0;
  const leadConversionRate = leads.length > 0 ? (leads.filter(l => l.status === "won").length / leads.length * 100) : 0;
  const activeCustomers = customers.filter(c => c.status === "active").length;

  const reportData = { jobs, invoices, customers, leads, technicians };

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">{activeCompany?.name} — analytics & insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Outstanding", value: `$${outstandingRevenue.toLocaleString()}`, icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Avg Job Value", value: `$${avgJobValue.toFixed(0)}`, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completion Rate", value: `${completionRate.toFixed(0)}%`, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Lead Conversion", value: `${leadConversionRate.toFixed(0)}%`, icon: UserPlus, color: "text-pink-600", bg: "bg-pink-50" },
          { label: "Active Customers", value: activeCustomers, icon: Users, color: "text-cyan-600", bg: "bg-cyan-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="custom">Custom Dashboards</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <RevenueAreaChart invoices={invoices} />
            <JobStatusPieChart jobs={jobs} />
            <LeadSourceChart leads={leads} />
            <OutstandingVsPaidChart invoices={invoices} />
          </div>
        </TabsContent>

        {/* REVENUE */}
        <TabsContent value="revenue" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <RevenueBarChart invoices={invoices} />
            <RevenueAreaChart invoices={invoices} />
            <AvgJobValueChart jobs={jobs} />
            <OutstandingVsPaidChart invoices={invoices} />
            <TopCustomersChart customers={customers} invoices={invoices} />
          </div>
        </TabsContent>

        {/* JOBS */}
        <TabsContent value="jobs" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <JobStatusPieChart jobs={jobs} />
            <AvgJobValueChart jobs={jobs} />
            <JobsPerTechChart jobs={jobs} technicians={technicians} />
          </div>
        </TabsContent>

        {/* CUSTOMERS */}
        <TabsContent value="customers" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <NewCustomersChart customers={customers} />
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

        {/* INVOICES */}
        <TabsContent value="invoices" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <InvoiceStatusChart invoices={invoices} />
            <OutstandingVsPaidChart invoices={invoices} />
            <RevenueBarChart invoices={invoices} />
          </div>
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <JobsPerTechChart jobs={jobs} technicians={technicians} />
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