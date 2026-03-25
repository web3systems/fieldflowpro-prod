import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { ArrowLeft, FileText, Briefcase, DollarSign, ExternalLink, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import CustomerSidebar from "@/components/customers/CustomerSidebar";
import CustomerAddresses from "@/components/customers/CustomerAddresses";
import CustomerTasks from "@/components/customers/CustomerTasks";
import CustomerNotes from "@/components/customers/CustomerNotes";
import AssignRecordModal from "@/components/customers/AssignRecordModal";

const statusStyle = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  lead: "bg-blue-100 text-blue-700",
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeCompany } = useApp();
  const [customer, setCustomer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activities, setActivities] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // "job" | "estimate" | "invoice"

  const loadData = useCallback(async () => {
    if (!id) return;
    const [cust, j, est, inv, acts, techs] = await Promise.all([
      base44.entities.Customer.filter({ id }),
      base44.entities.Job.filter({ customer_id: id }),
      base44.entities.Estimate.filter({ customer_id: id }),
      base44.entities.Invoice.filter({ customer_id: id }),
      base44.entities.Activity.filter({ related_to_id: id }),
      activeCompany ? base44.entities.Technician.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
    ]);
    if (cust.length > 0) setCustomer(cust[0]);
    setJobs(j);
    setEstimates(est);
    setInvoices(inv);
    setActivities(acts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setTechnicians(techs);
    setLoading(false);
  }, [id, activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleUpdate(data) {
    const updated = await base44.entities.Customer.update(id, data);
    setCustomer(prev => ({ ...prev, ...data }));
  }

  async function handlePortalInvite() {
    if (!customer?.email) return;
    setSendingInvite(true);
    const portalUrl = window.location.origin + "/CustomerPortal";
    await base44.functions.invoke("sendPortalInvite", { customer_id: id, portal_url: portalUrl });
    setSendingInvite(false);
    alert("Portal invite sent to " + customer.email);
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!customer) return (
    <div className="p-6 text-center text-slate-500">Customer not found.</div>
  );

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("Customers"))} className="gap-1 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Customers
        </Button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
            {customer.first_name?.[0]}{customer.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{customer.first_name} {customer.last_name}</h1>
            <Badge className={`text-xs mt-0.5 ${statusStyle[customer.status] || "bg-gray-100 text-gray-600"}`}>{customer.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl(`Estimates?customer_id=${id}`))} className="gap-1 text-xs hidden sm:flex">
            <FileText className="w-3.5 h-3.5" /> New Estimate
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl(`Jobs?customer_id=${id}`))} className="gap-1 text-xs hidden sm:flex">
            <Briefcase className="w-3.5 h-3.5" /> New Job
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1 text-xs" onClick={() => navigate(createPageUrl(`Invoices?customer_id=${id}`))}>
            <DollarSign className="w-3.5 h-3.5" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex gap-5">
        {/* Left sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
          <CustomerSidebar
            customer={customer}
            invoices={invoices}
            onUpdate={handleUpdate}
            onPortalInvite={handlePortalInvite}
            sendingInvite={sendingInvite}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile sidebar summary */}
          <div className="lg:hidden">
            <CustomerSidebar
              customer={customer}
              invoices={invoices}
              onUpdate={handleUpdate}
              onPortalInvite={handlePortalInvite}
              sendingInvite={sendingInvite}
            />
          </div>

          {/* Jobs */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-slate-500" /> Jobs ({jobs.length})
              </h3>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate(createPageUrl(`Jobs?customer_id=${id}`))}>
                <Briefcase className="w-3 h-3" /> New Job
              </Button>
            </div>
            {jobs.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No jobs yet.</p>
            ) : (
              <div className="space-y-2">
                {jobs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(job => (
                  <div key={job.id} onClick={() => navigate(`/JobDetail/${job.id}`)} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
                      <p className="text-xs text-slate-400">
                        {job.scheduled_start ? format(new Date(job.scheduled_start), "MMM d, yyyy") : format(new Date(job.created_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge className={`text-xs ${job.status === "completed" ? "bg-green-100 text-green-700" : job.status === "in_progress" ? "bg-amber-100 text-amber-700" : job.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {job.status?.replace("_", " ")}
                      </Badge>
                      {job.total_amount > 0 && <span className="text-xs font-semibold text-slate-700">${job.total_amount.toLocaleString()}</span>}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estimates */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" /> Estimates ({estimates.length})
              </h3>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate(createPageUrl(`Estimates?customer_id=${id}`))}>
                <FileText className="w-3 h-3" /> New Estimate
              </Button>
            </div>
            {estimates.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No estimates yet.</p>
            ) : (
              <div className="space-y-2">
                {estimates.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(est => (
                  <div key={est.id} onClick={() => navigate(`/EstimateDetail/${est.id}`)} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{est.title || est.estimate_number || "Estimate"}</p>
                      <p className="text-xs text-slate-400">{format(new Date(est.created_date), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge className={`text-xs ${est.status === "approved" ? "bg-green-100 text-green-700" : est.status === "declined" ? "bg-red-100 text-red-700" : est.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {est.status}
                      </Badge>
                      {est.total > 0 && <span className="text-xs font-semibold text-slate-700">${est.total.toLocaleString()}</span>}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-slate-500" /> Invoices ({invoices.length})
              </h3>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate(createPageUrl(`Invoices?customer_id=${id}`))}>
                <DollarSign className="w-3 h-3" /> New Invoice
              </Button>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {invoices.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(inv => (
                  <div key={inv.id} onClick={() => navigate(`/InvoiceDetail/${inv.id}`)} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">Invoice #{inv.invoice_number || inv.id.slice(-6)}</p>
                      <p className="text-xs text-slate-400">{format(new Date(inv.created_date), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge className={`text-xs ${inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : inv.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {inv.status}
                      </Badge>
                      {inv.total > 0 && <span className="text-xs font-semibold text-slate-700">${inv.total.toLocaleString()}</span>}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <CustomerTasks customer={customer} onUpdate={handleUpdate} />
          <CustomerAddresses customer={customer} onUpdate={handleUpdate} />
          <CustomerNotes
            customerId={id}
            companyId={customer.company_id}
            activities={activities}
            onActivityAdded={loadData}
          />
        </div>
      </div>
    </div>
  );
}