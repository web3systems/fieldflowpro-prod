import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Calendar, FileText, DollarSign, User, LogOut,
  MessageCircle, ExternalLink, ThumbsUp, ThumbsDown,
  MapPin, Phone, Mail, CheckCircle, AlertCircle,
  ChevronRight, Building2, Gift, Wallet, PlusCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const STATUS_STYLES = {
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  scheduled: { label: "Scheduled", color: "bg-purple-100 text-purple-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const INVOICE_STATUS = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700" },
  viewed: { label: "Viewed", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Paid", color: "bg-green-100 text-green-700" },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700" },
};

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

export default function CustomerPortal() {
  const [user, setUser] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [companyServices, setCompanyServices] = useState([]);
  const [activeTab, setActiveTab] = useState("appointments");
  const [invoiceSubTab, setInvoiceSubTab] = useState("appointments");
  const [loading, setLoading] = useState(true);

  // Booking
  const [bookingForm, setBookingForm] = useState({ service_type: "", preferred_date: "", preferred_time: "9:00 AM", notes: "" });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Pagination
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceRowsPerPage, setInvoiceRowsPerPage] = useState(25);
  const [jobPage, setJobPage] = useState(1);
  const [jobRowsPerPage, setJobRowsPerPage] = useState(25);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (allAccounts.length > 0) {
      loadAccountData(allAccounts[activeIndex].customer);
    }
  }, [activeIndex, allAccounts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.get("payment_success");
    const paidInvoiceId = params.get("invoice_id");
    if (paymentSuccess === "true" && paidInvoiceId) {
      base44.entities.Invoice.update(paidInvoiceId, {
        status: "paid",
        paid_date: new Date().toISOString().split("T")[0],
        payment_method: "stripe",
      }).catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
      setActiveTab("invoices");
    } else if (params.has("estimate_id")) {
      setActiveTab("estimates");
    } else if (params.has("invoice_id")) {
      setActiveTab("invoices");
    }
  }, []);

  async function init() {
    try {
      const u = await base44.auth.me();
      setUser(u);

      const allCustomers = await base44.entities.Customer.list();
      const matched = allCustomers.filter(c => c.portal_user_id === u.id || c.email === u.email);

      if (matched.length === 0) {
        if (u?.role && u.role !== "user") { window.location.href = "/Dashboard"; return; }
        const accessRecords = await base44.entities.UserCompanyAccess.filter({ user_email: u.email });
        if (accessRecords.length > 0) { window.location.href = "/Dashboard"; return; }
        setLoading(false);
        return;
      }

      const allCompanies = await base44.entities.Company.list();
      const companyMap = Object.fromEntries(allCompanies.map(c => [c.id, c]));
      const accounts = matched.map(customer => ({ customer, company: companyMap[customer.company_id] || null }));
      setAllAccounts(accounts);
    } catch (e) {
      base44.auth.redirectToLogin();
    }
    setLoading(false);
  }

  async function loadAccountData(customer) {
    const [j, inv, est, svcs] = await Promise.all([
      base44.entities.Job.filter({ customer_id: customer.id }),
      base44.entities.Invoice.filter({ customer_id: customer.id }),
      base44.entities.Estimate.filter({ customer_id: customer.id }),
      base44.entities.Service.filter({ company_id: customer.company_id, is_active: true }),
    ]);
    setJobs(j);
    setInvoices(inv);
    setEstimates(est);
    setCompanyServices(svcs);
  }

  async function approveEstimate(est) {
    await base44.entities.Estimate.update(est.id, { status: "approved" });
    const updated = await base44.entities.Estimate.filter({ customer_id: activeAccount.customer.id });
    setEstimates(updated);
  }

  async function declineEstimate(est) {
    await base44.entities.Estimate.update(est.id, { status: "declined" });
    const updated = await base44.entities.Estimate.filter({ customer_id: activeAccount.customer.id });
    setEstimates(updated);
  }

  async function submitBookingRequest(e) {
    e.preventDefault();
    setBookingLoading(true);
    await base44.functions.invoke("submitBooking", {
      ...bookingForm,
      company_id: company.id,
      customer_id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    });
    setBookingLoading(false);
    setBookingSubmitted(true);
  }

  const activeAccount = allAccounts[activeIndex] || null;
  const customer = activeAccount?.customer || null;
  const company = activeAccount?.company || null;
  const accentColor = company?.primary_color || "#2563eb";

  const navItems = [
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "invoices", label: "Invoices", icon: DollarSign },
    { id: "estimates", label: "Estimates", icon: FileText },
    { id: "gallery", label: "Gallery", icon: null },
  ];

  const accountItems = [
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "referral", label: "Referral program", icon: Gift },
  ];

  const breadcrumbMap = {
    appointments: "Appointments",
    invoices: "Invoices",
    estimates: "Estimates",
    gallery: "Gallery",
    wallet: "Wallet",
    referral: "Referral Program",
    book: "Book Service",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Account Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">We couldn't find a customer account linked to your email.</p>
          <Button onClick={() => base44.auth.logout()} variant="outline" className="w-full">Sign Out</Button>
        </div>
      </div>
    );
  }

  // Paginated data
  const paginatedInvoices = invoices.slice((invoicePage - 1) * invoiceRowsPerPage, invoicePage * invoiceRowsPerPage);
  const paginatedJobs = jobs.slice((jobPage - 1) * jobRowsPerPage, jobPage * jobRowsPerPage);

  function renderPageInfo(total, page, rowsPerPage) {
    const start = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
    const end = Math.min(page * rowsPerPage, total);
    return `${start}-${end} of ${total}`;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 flex items-center justify-between px-6 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-10 w-auto object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: accentColor }}>
              {company?.name?.[0] || "C"}
            </div>
          )}
          <span className="text-lg font-bold text-slate-800">{company?.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-slate-600"
            onClick={() => setActiveTab("messages")}
          >
            <MessageCircle className="w-4 h-4" />
            Send a message
          </Button>
          <Button
            size="sm"
            className="gap-2 text-white"
            style={{ backgroundColor: accentColor }}
            onClick={() => setActiveTab("book")}
          >
            Book online
          </Button>
          <span className="text-sm text-slate-500 ml-2">
            LOGGED IN AS: <span className="font-semibold text-slate-700 uppercase">{customer.first_name} {customer.last_name}</span>
          </span>
          <button onClick={() => base44.auth.logout()} className="text-slate-400 hover:text-slate-600 ml-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col py-4">
          <nav className="flex-1 px-3 space-y-0.5">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  activeTab === id
                    ? "text-blue-600 font-semibold bg-blue-50"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                style={activeTab === id ? { color: accentColor } : {}}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                {label}
              </button>
            ))}

            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Account</p>
            </div>

            {accountItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  activeTab === id
                    ? "text-blue-600 font-semibold bg-blue-50"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                style={activeTab === id ? { color: accentColor } : {}}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                {label}
              </button>
            ))}
          </nav>

          {/* Company switcher if multiple */}
          {allAccounts.length > 1 && (
            <div className="px-3 pt-4 border-t border-slate-100 mt-4">
              <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Switch account</p>
              {allAccounts.map(({ customer: c, company: co }, idx) => (
                <button
                  key={c.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm mb-1 transition-colors ${idx === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: co?.primary_color || "#3b82f6" }}>
                    {co?.name?.[0]}
                  </div>
                  <span className="truncate text-slate-700">{co?.name}</span>
                  {idx === activeIndex && <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="px-8 py-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
              <span>Customer Portal</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-600">{breadcrumbMap[activeTab] || activeTab}</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-6">{breadcrumbMap[activeTab] || activeTab}</h1>

            {/* Appointments Tab */}
            {activeTab === "appointments" && (
              <div>
                <div className="flex border-b border-slate-200 mb-4">
                  <button
                    onClick={() => setInvoiceSubTab("appointments")}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${invoiceSubTab === "appointments" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                    style={invoiceSubTab === "appointments" ? { borderColor: accentColor, color: accentColor } : {}}
                  >
                    APPOINTMENTS
                  </button>
                  <button
                    onClick={() => setInvoiceSubTab("service_plans")}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${invoiceSubTab === "service_plans" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                    style={invoiceSubTab === "service_plans" ? { borderColor: accentColor, color: accentColor } : {}}
                  >
                    SERVICE PLANS
                  </button>
                </div>

                {invoiceSubTab === "appointments" && (
                  <div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Job</th>
                          <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Service type</th>
                          <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Scheduled date</th>
                          <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Address</th>
                          <th className="text-left py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedJobs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-16 text-slate-400">No appointments</td>
                          </tr>
                        ) : (
                          paginatedJobs.map(job => {
                            const s = STATUS_STYLES[job.status] || STATUS_STYLES.new;
                            return (
                              <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 pr-4 font-medium text-slate-800">{job.title}</td>
                                <td className="py-3 pr-4 text-slate-600">{job.service_type || "—"}</td>
                                <td className="py-3 pr-4 text-slate-600">
                                  {job.scheduled_start ? format(new Date(job.scheduled_start), "MMM d, yyyy · h:mm a") : "—"}
                                </td>
                                <td className="py-3 pr-4 text-slate-600">{job.address || "—"}</td>
                                <td className="py-3">
                                  <Badge className={`text-xs ${s.color}`}>{s.label}</Badge>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                    <PaginationBar
                      total={jobs.length}
                      page={jobPage}
                      rowsPerPage={jobRowsPerPage}
                      onPageChange={setJobPage}
                      onRowsPerPageChange={v => { setJobRowsPerPage(v); setJobPage(1); }}
                    />
                  </div>
                )}

                {invoiceSubTab === "service_plans" && (
                  <div className="text-center py-16 text-slate-400">No service plans</div>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === "invoices" && (
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Invoice #</th>
                      <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Total</th>
                      <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Date</th>
                      <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Due date</th>
                      <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Status</th>
                      <th className="text-left py-3 font-semibold text-slate-500 text-xs uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-slate-400">No invoices</td>
                      </tr>
                    ) : (
                      paginatedInvoices.map(inv => {
                        const s = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent;
                        const canPay = !["paid", "void", "draft"].includes(inv.status);
                        return (
                          <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 pr-4 font-medium text-slate-800">{inv.invoice_number || "—"}</td>
                            <td className="py-3 pr-4 text-slate-700 font-semibold">${(inv.total || 0).toFixed(2)}</td>
                            <td className="py-3 pr-4 text-slate-600">
                              {inv.created_date ? format(new Date(inv.created_date), "MMM d, yyyy") : "—"}
                            </td>
                            <td className="py-3 pr-4 text-slate-600">
                              {inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "—"}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge className={`text-xs ${s.color}`}>{s.label}</Badge>
                            </td>
                            <td className="py-3">
                              {canPay && (
                                <button
                                  onClick={async () => {
                                    const isInIframe = window.self !== window.top;
                                    if (isInIframe) { alert("Payment only works from the published app."); return; }
                                    const res = await base44.functions.invoke("createStripeCheckout", {
                                      invoice_id: inv.id,
                                      success_url: window.location.href.split("?")[0] + "?invoice_id=" + inv.id,
                                      cancel_url: window.location.href.split("?")[0],
                                    });
                                    if (res.data?.url) window.location.href = res.data.url;
                                    else alert(res.data?.error || "Failed to start checkout.");
                                  }}
                                  className="text-xs px-3 py-1.5 rounded-md font-semibold text-white"
                                  style={{ backgroundColor: accentColor }}
                                >
                                  Pay Now
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <PaginationBar
                  total={invoices.length}
                  page={invoicePage}
                  rowsPerPage={invoiceRowsPerPage}
                  onPageChange={setInvoicePage}
                  onRowsPerPageChange={v => { setInvoiceRowsPerPage(v); setInvoicePage(1); }}
                />
              </div>
            )}

            {/* Estimates Tab */}
            {activeTab === "estimates" && (
              <div>
                {estimates.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">No estimates</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Estimate #</th>
                        <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Title</th>
                        <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Total</th>
                        <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Valid until</th>
                        <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Status</th>
                        <th className="text-left py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimates.map(est => (
                        <tr key={est.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 pr-4 font-mono text-xs text-slate-500">{est.estimate_number || "—"}</td>
                          <td className="py-3 pr-4 font-medium text-slate-800">{est.title}</td>
                          <td className="py-3 pr-4 font-semibold text-slate-700">${(est.total || 0).toFixed(2)}</td>
                          <td className="py-3 pr-4 text-slate-600">
                            {est.valid_until ? format(new Date(est.valid_until), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge className={`text-xs capitalize ${
                              est.status === "approved" ? "bg-green-100 text-green-700" :
                              est.status === "declined" ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>{est.status}</Badge>
                          </td>
                          <td className="py-3">
                            {["sent", "viewed", "draft"].includes(est.status) && (
                              <div className="flex gap-2">
                                <button onClick={() => approveEstimate(est)} className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" /> Approve
                                </button>
                                <button onClick={() => declineEstimate(est)} className="text-xs px-3 py-1 border border-red-200 text-red-600 rounded-md hover:bg-red-50 flex items-center gap-1">
                                  <ThumbsDown className="w-3 h-3" /> Decline
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Gallery Tab */}
            {activeTab === "gallery" && (
              <div className="text-center py-16 text-slate-400">No gallery photos yet.</div>
            )}

            {/* Wallet Tab */}
            {activeTab === "wallet" && (
              <div className="text-center py-16 text-slate-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No wallet information available.</p>
              </div>
            )}

            {/* Referral Program Tab */}
            {activeTab === "referral" && (
              <div className="max-w-lg">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <Gift className="w-10 h-10 mb-3" style={{ color: accentColor }} />
                  <h2 className="text-lg font-bold text-slate-800 mb-2">Referral Program</h2>
                  <p className="text-slate-600 text-sm mb-4">
                    {company?.portal_settings?.referral_message || "Share us with a friend and we'll take care of them just like we take care of you!"}
                  </p>
                  <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-mono text-slate-600 truncate">{customer.first_name?.toLowerCase()}-{customer.last_name?.toLowerCase()}-referral</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/Booking?ref=${customer.first_name?.toLowerCase()}-${customer.last_name?.toLowerCase()}`);
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md text-white flex-shrink-0"
                      style={{ backgroundColor: accentColor }}
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === "messages" && (
              <div className="max-w-lg">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <h2 className="text-lg font-bold text-slate-700 mb-2">Send a Message</h2>
                  <p className="text-slate-500 text-sm mb-4">To get in touch, please contact us directly:</p>
                  {company?.phone && <p className="text-slate-700 font-medium mb-1">📞 {company.phone}</p>}
                  {company?.email && <p className="text-slate-700 font-medium">✉️ {company.email}</p>}
                  {!company?.phone && !company?.email && <p className="text-slate-400 text-sm">Contact info not available.</p>}
                </div>
              </div>
            )}

            {/* Book Tab */}
            {activeTab === "book" && (
              <div className="max-w-lg">
                {bookingSubmitted ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">Request Submitted!</p>
                    <p className="text-slate-400 text-sm mt-1">We'll confirm your appointment soon.</p>
                    <button
                      onClick={() => { setBookingSubmitted(false); setBookingForm({ service_type: "", preferred_date: "", preferred_time: "9:00 AM", notes: "" }); }}
                      className="mt-4 text-sm font-medium"
                      style={{ color: accentColor }}
                    >
                      Book Another
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <form onSubmit={submitBookingRequest} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">What service do you need? *</label>
                        {companyServices.length > 0 ? (
                          <select
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={bookingForm.service_type}
                            onChange={e => setBookingForm({ ...bookingForm, service_type: e.target.value })}
                          >
                            <option value="">Select a service...</option>
                            {companyServices.map(svc => (
                              <option key={svc.id} value={svc.name}>{svc.name}{svc.unit_price > 0 ? ` — $${svc.unit_price}` : ""}</option>
                            ))}
                            <option value="Other">Other / Not listed</option>
                          </select>
                        ) : (
                          <input
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={bookingForm.service_type}
                            onChange={e => setBookingForm({ ...bookingForm, service_type: e.target.value })}
                            placeholder="e.g. Lawn mowing, Deep clean..."
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Preferred Date *</label>
                        <input
                          required type="date"
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={bookingForm.preferred_date}
                          onChange={e => setBookingForm({ ...bookingForm, preferred_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Preferred Time</label>
                        <select
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={bookingForm.preferred_time}
                          onChange={e => setBookingForm({ ...bookingForm, preferred_time: e.target.value })}
                        >
                          {["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
                        <textarea
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          value={bookingForm.notes}
                          onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                          placeholder="Any special instructions..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={bookingLoading}
                        className="w-full py-2.5 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60 text-sm"
                        style={{ backgroundColor: accentColor }}
                      >
                        {bookingLoading ? "Sending..." : "Send Request"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PaginationBar({ total, page, rowsPerPage, onPageChange, onRowsPerPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const start = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, total);

  return (
    <div className="flex items-center justify-end gap-4 mt-4 pt-3 border-t border-slate-100 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={rowsPerPage}
          onChange={e => onRowsPerPageChange(Number(e.target.value))}
          className="border border-slate-200 rounded px-2 py-1 text-sm"
        >
          {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <span>{start}-{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"
        >
          ‹
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"
        >
          ›
        </button>
      </div>
    </div>
  );
}