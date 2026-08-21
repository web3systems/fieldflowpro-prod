import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { ArrowLeft, FileText, Briefcase, DollarSign, ExternalLink, Calendar, ChevronRight, Link2, CreditCard, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

import CustomerSidebar from "@/components/customers/CustomerSidebar";
import CustomerAddresses from "@/components/customers/CustomerAddresses";
import CustomerTasks from "@/components/customers/CustomerTasks";
import CustomerNotes from "@/components/customers/CustomerNotes";
import AssignRecordModal from "@/components/customers/AssignRecordModal";
import EditCustomerModal from "@/components/customers/EditCustomerModal";
import CustomerSmsPanel from "@/components/customers/CustomerSmsPanel";
import CustomerReviews from "@/components/reviews/CustomerReviews";
import RequestReviewModal from "@/components/reviews/RequestReviewModal";
import WorkOverview from "@/components/customers/WorkOverview";
import CustomerSummaryPanel from "@/components/customers/CustomerSummaryPanel";
import { Phone, Mail } from "lucide-react";

const statusStyle = {
  active: "bg-blue-100 text-blue-700",
  inactive: "bg-gray-100 text-gray-600",
  lead: "bg-amber-100 text-amber-700",
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
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // "job" | "estimate" | "invoice"
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [cust, j, est, inv, acts, techs, bk] = await Promise.all([
      base44.entities.Customer.filter({ id }),
      base44.entities.Job.filter({ customer_id: id }),
      base44.entities.Estimate.filter({ customer_id: id }),
      base44.entities.Invoice.filter({ customer_id: id }),
      base44.entities.Activity.filter({ related_to_id: id }),
      activeCompany ? base44.entities.Technician.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
      base44.entities.ServiceBooking.filter({ customer_id: id }),
    ]);
    if (cust.length > 0) setCustomer(cust[0]);
    setJobs(j);
    setEstimates(est);
    setInvoices(inv);
    setActivities(acts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setTechnicians(techs);
    setBookings(bk);
    // Load payments for all invoices belonging to this customer
    const invoiceIds = inv.map(i => i.id);
    if (invoiceIds.length > 0) {
      const allPmts = await Promise.all(invoiceIds.map(iid => base44.entities.Payment.filter({ invoice_id: iid }).catch(() => [])));
      setPayments(allPmts.flat().sort((a, b) => new Date(b.received_date) - new Date(a.received_date)));
    } else {
      setPayments([]);
    }
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
    const now = new Date().toISOString();
    await base44.entities.Customer.update(id, { portal_invite_sent: true, portal_invite_sent_at: now });
    setCustomer(prev => ({ ...prev, portal_invite_sent: true, portal_invite_sent_at: now }));
    setSendingInvite(false);
    alert("Portal invite sent to " + customer.email);
  }

  function handlePreviewPortal() {
    window.open(`/CustomerPortal?preview_customer_id=${id}`, "_blank");
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
            {customer.business_name ? customer.business_name[0].toUpperCase() : `${customer.first_name?.[0] || ""}${customer.last_name?.[0] || ""}`}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "—"}
            </h1>
            {customer.business_name && (customer.first_name || customer.last_name) && (
              <p className="text-sm text-slate-500 leading-tight">{customer.first_name} {customer.last_name}</p>
            )}
            <Badge className={`text-xs mt-0.5 ${statusStyle[customer.status] || "bg-gray-100 text-gray-600"}`}>{customer.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Customer Portal
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="flex items-center gap-2">
                Portal access
                {customer.portal_invite_sent
                  ? <Badge className="text-[10px] bg-green-100 text-green-700">Invited</Badge>
                  : <Badge className="text-[10px] bg-amber-100 text-amber-700">Not invited</Badge>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {customer.email ? (
                <>
                  <DropdownMenuItem onClick={handlePortalInvite} disabled={sendingInvite}>
                    {sendingInvite ? "Sending..." : customer.portal_invite_sent ? "Resend invite" : "Send invite"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePreviewPortal}>Preview portal</DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled>No email on file</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)} className="gap-1 text-xs">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl(`Estimates?customer_id=${id}`))} className="gap-1 text-xs hidden sm:flex">
            <FileText className="w-3.5 h-3.5" /> New Estimate
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl(`NewEstimate?customer_id=${id}`))} className="gap-1 text-xs hidden sm:flex">
            <Briefcase className="w-3.5 h-3.5" /> New Job
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1 text-xs" onClick={() => navigate(createPageUrl(`Invoices?customer_id=${id}`))}>
            <DollarSign className="w-3.5 h-3.5" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Info Bar: phone/email | payment terms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Phone className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Phone</p>
            <p className="text-sm font-medium text-slate-800 truncate">{customer.phone || "—"}</p>
          </div>
          <div className="w-px h-8 bg-slate-200 mx-2" />
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Email</p>
            <p className="text-sm font-medium text-slate-800 truncate">{customer.email || "—"}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Payment Terms</p>
            <p className="text-sm font-medium text-slate-800">
              {customer.customer_type === "business" ? "Net 30 (Business)" : "Due on Receipt"}
            </p>
          </div>
        </div>
      </div>

      {/* Split Layout: swapped — summary/notes/reviews on left, work sections on right */}
      <div className="flex gap-5 lg:flex-row-reverse">
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
              onPreviewPortal={handlePreviewPortal}
            />
          </div>

          <WorkOverview
            customer={customer}
            bookings={bookings}
            estimates={estimates}
            jobs={jobs}
            invoices={invoices}
          />

          <CustomerSmsPanel customer={customer} />
          <CustomerTasks customer={customer} onUpdate={handleUpdate} />
          <CustomerAddresses customer={customer} onUpdate={handleUpdate} />
        </div>

        {/* Right summary panel */}
        <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">
          <CustomerSummaryPanel customer={customer} invoices={invoices} />
          <CustomerNotes
            customerId={id}
            companyId={customer.company_id}
            activities={activities}
            onActivityAdded={loadData}
          />
          <CustomerReviews
            customerId={id}
            companyId={customer.company_id}
            onRequestReview={() => setShowReviewModal(true)}
          />
        </div>
      </div>

      <EditCustomerModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        customer={customer}
        onSaved={loadData}
      />

      <RequestReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        customer={customer}
        company={activeCompany}
      />

      <AssignRecordModal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        type={assignModal}
        companyId={customer.company_id}
        customerId={id}
        customerName={`${customer.first_name} ${customer.last_name}`}
        onAssigned={loadData}
      />
    </div>
  );
}