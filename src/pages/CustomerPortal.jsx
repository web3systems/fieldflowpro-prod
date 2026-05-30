import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Calendar, FileText, DollarSign, LogOut,
  MessageCircle, ThumbsUp, ThumbsDown,
  CheckCircle, AlertCircle,
  ChevronRight, Gift, Wallet,
  Camera, ChevronDown, ChevronUp, ImageIcon
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
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700" },
  viewed: { label: "Viewed", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Paid", color: "bg-green-100 text-green-700" },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700" },
};

export default function CustomerPortal() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Account data (from secure backend)
  const [accounts, setAccounts] = useState([]); // [{customer, company}]
  const [activeIndex, setActiveIndex] = useState(0);

  // Per-account data
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [services, setServices] = useState([]);
  const [accountDataLoading, setAccountDataLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("appointments");
  const [appointmentSubTab, setAppointmentSubTab] = useState("appointments");
  const [expandedJobPhotos, setExpandedJobPhotos] = useState({});

  // Booking
  const [bookingForm, setBookingForm] = useState({ service_type: "", preferred_date: "", preferred_time: "9:00 AM", notes: "" });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_success") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      setActiveTab("invoices");
    } else if (params.has("estimate_id")) {
      setActiveTab("estimates");
    } else if (params.has("invoice_id")) {
      setActiveTab("invoices");
    }
  }, []);

  useEffect(() => {
    if (accounts.length > 0) {
      loadAccountData(accounts[activeIndex].customer.id);
    }
  }, [activeIndex, accounts]);

  async function init() {
    try {
      const res = await base44.functions.invoke("getCustomerPortalData", { action: "init" });
      const data = res.data;

      if (data.is_staff) {
        window.location.href = "/Dashboard";
        return;
      }

      if (!data.customers || data.customers.length === 0) {
        setError("no_account");
        setLoading(false);
        return;
      }

      const companyMap = Object.fromEntries((data.companies || []).map(c => [c.id, c]));
      const accts = data.customers.map(c => ({ customer: c, company: companyMap[c.company_id] || null }));
      setAccounts(accts);
    } catch (e) {
      // Not logged in
      base44.auth.redirectToLogin(window.location.href);
    }
    setLoading(false);
  }

  async function loadAccountData(customerId) {
    setAccountDataLoading(true);
    try {
      const res = await base44.functions.invoke("getCustomerPortalData", {
        action: "load_account",
        payload: { customer_id: customerId },
      });
      const d = res.data;
      setJobs(d.jobs || []);
      setInvoices(d.invoices || []);
      setEstimates(d.estimates || []);
      setServices(d.services || []);
    } catch (e) {
      console.error("Failed to load account data", e);
    }
    setAccountDataLoading(false);
  }

  async function handleEstimateDecision(estimate, decision) {
    await base44.functions.invoke("getCustomerPortalData", {
      action: "approve_estimate",
      payload: { estimate_id: estimate.id, decision },
    });
    // Refresh estimates
    await loadAccountData(activeAccount.customer.id);
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

  const activeAccount = accounts[activeIndex] || null;
  const customer = activeAccount?.customer || null;
  const company = activeAccount?.company || null;
  const accentColor = company?.primary_color || "#2563eb";

  const navItems = [
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "invoices", label: "Invoices", icon: DollarSign },
    { id: "estimates", label: "Estimates", icon: FileText },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
  ];

  const accountItems = [
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "referral", label: "Referral Program", icon: Gift },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error === "no_account") {
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

  if (!customer) return null;

  const breadcrumbMap = {
    appointments: "Appointments",
    invoices: "Invoices",
    estimates: "Estimates",
    gallery: "Gallery",
    wallet: "Wallet",
    referral: "Referral Program",
    book: "Book Service",
    messages: "Messages",
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
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
          <Button variant="outline" size="sm" className="gap-2 text-slate-600 hidden sm:flex" onClick={() => setActiveTab("messages")}>
            <MessageCircle className="w-4 h-4" /> Send a message
          </Button>
          <Button size="sm" className="gap-2 text-white hidden sm:flex" style={{ backgroundColor: accentColor }} onClick={() => setActiveTab("book")}>
            Book online
          </Button>
          <span className="text-sm text-slate-500 hidden md:block">
            <span className="font-semibold text-slate-700">{customer.first_name} {customer.last_name}</span>
          </span>
          <button onClick={() => base44.auth.logout()} className="text-slate-400 hover:text-slate-600">
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
                  activeTab === id ? "font-semibold bg-blue-50" : "text-slate-600 hover:bg-slate-50"
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
                  activeTab === id ? "font-semibold bg-blue-50" : "text-slate-600 hover:bg-slate-50"
                }`}
                style={activeTab === id ? { color: accentColor } : {}}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                {label}
              </button>
            ))}
          </nav>

          {/* Multi-account switcher */}
          {accounts.length > 1 && (
            <div className="px-3 pt-4 border-t border-slate-100 mt-4">
              <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Switch account</p>
              {accounts.map(({ customer: c, company: co }, idx) => (
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
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
              <span>Customer Portal</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-600">{breadcrumbMap[activeTab] || activeTab}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">{breadcrumbMap[activeTab] || activeTab}</h1>

            {accountDataLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!accountDataLoading && (
              <>
                {/* Appointments */}
                {activeTab === "appointments" && (
                  <div>
                    <div className="flex border-b border-slate-200 mb-4">
                      {["appointments", "service_plans"].map(sub => (
                        <button
                          key={sub}
                          onClick={() => setAppointmentSubTab(sub)}
                          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${appointmentSubTab === sub ? "border-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                          style={appointmentSubTab === sub ? { borderColor: accentColor, color: accentColor } : {}}
                        >
                          {sub === "appointments" ? "APPOINTMENTS" : "SERVICE PLANS"}
                        </button>
                      ))}
                    </div>

                    {appointmentSubTab === "appointments" && (
                      <div>
                        {jobs.length === 0 ? (
                          <div className="text-center py-16 text-slate-400">No appointments yet.</div>
                        ) : (
                          <div className="space-y-2">
                            {jobs.map(job => {
                              const s = STATUS_STYLES[job.status] || STATUS_STYLES.new;
                              const hasPhotos = job.before_photos?.length > 0 || job.after_photos?.length > 0;
                              const isExpanded = expandedJobPhotos[job.id];
                              return (
                                <div key={job.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="flex items-center gap-3 px-4 py-3 bg-white">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-slate-800 text-sm truncate">{job.title}</p>
                                      <p className="text-xs text-slate-500">
                                        {job.service_type ? `${job.service_type} · ` : ""}
                                        {job.scheduled_start ? format(new Date(job.scheduled_start), "MMM d, yyyy") : "Not scheduled"}
                                        {job.address ? ` · ${job.address}` : ""}
                                      </p>
                                    </div>
                                    <Badge className={`text-xs flex-shrink-0 ${s.color}`}>{s.label}</Badge>
                                    {hasPhotos && (
                                      <button
                                        onClick={() => setExpandedJobPhotos(p => ({ ...p, [job.id]: !p[job.id] }))}
                                        className="flex items-center gap-1 text-xs font-medium flex-shrink-0"
                                        style={{ color: accentColor }}
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                        Photos
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </button>
                                    )}
                                  </div>
                                  {hasPhotos && isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 grid grid-cols-2 gap-4">
                                      {job.before_photos?.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Before ({job.before_photos.length})
                                          </p>
                                          <div className="grid grid-cols-3 gap-1.5">
                                            {job.before_photos.map((url, i) => (
                                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                                <img src={url} alt={`before-${i}`} className="aspect-square object-cover rounded-lg w-full hover:opacity-90 transition-opacity" />
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {job.after_photos?.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> After ({job.after_photos.length})
                                          </p>
                                          <div className="grid grid-cols-3 gap-1.5">
                                            {job.after_photos.map((url, i) => (
                                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                                <img src={url} alt={`after-${i}`} className="aspect-square object-cover rounded-lg w-full hover:opacity-90 transition-opacity" />
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {appointmentSubTab === "service_plans" && (
                      <div className="text-center py-16 text-slate-400">No service plans.</div>
                    )}
                  </div>
                )}

                {/* Invoices */}
                {activeTab === "invoices" && (
                  <div>
                    {invoices.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">No invoices yet.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Invoice #</th>
                            <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Total</th>
                            <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Date</th>
                            <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Due Date</th>
                            <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Status</th>
                            <th className="text-left py-3 font-semibold text-slate-500 text-xs uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map(inv => {
                            const s = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent;
                            const canPay = !["paid", "void"].includes(inv.status);
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
                                        const base = window.location.href.split("?")[0];
                                        const res = await base44.functions.invoke("createStripeCheckout", {
                                          invoice_id: inv.id,
                                          success_url: `${base}?payment_success=true&invoice_id=${inv.id}`,
                                          cancel_url: `${base}?invoice_id=${inv.id}`,
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
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Estimates */}
                {activeTab === "estimates" && (
                  <div>
                    {estimates.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">No estimates yet.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Estimate #</th>
                            <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Title</th>
                            <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Total</th>
                            <th className="text-left py-3 pr-4 font-semibold text-slate-500 text-xs uppercase">Valid Until</th>
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
                                {["sent", "viewed"].includes(est.status) && (
                                  <div className="flex gap-2">
                                    <button onClick={() => handleEstimateDecision(est, "approved")} className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1">
                                      <ThumbsUp className="w-3 h-3" /> Approve
                                    </button>
                                    <button onClick={() => handleEstimateDecision(est, "declined")} className="text-xs px-3 py-1 border border-red-200 text-red-600 rounded-md hover:bg-red-50 flex items-center gap-1">
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

                {/* Gallery */}
                {activeTab === "gallery" && (() => {
                  const jobsWithPhotos = jobs.filter(j => j.before_photos?.length > 0 || j.after_photos?.length > 0);
                  if (jobsWithPhotos.length === 0) {
                    return (
                      <div className="text-center py-16 text-slate-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>No project photos yet.</p>
                        <p className="text-sm mt-1">Before & after photos will appear here once uploaded.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-8">
                      {jobsWithPhotos.map(job => (
                        <div key={job.id} className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{job.title}</p>
                              <p className="text-xs text-slate-500">
                                {job.service_type ? `${job.service_type} · ` : ""}
                                {job.scheduled_start ? format(new Date(job.scheduled_start), "MMM d, yyyy") : ""}
                              </p>
                            </div>
                            <Badge className={`text-xs ${(STATUS_STYLES[job.status] || STATUS_STYLES.new).color}`}>
                              {(STATUS_STYLES[job.status] || STATUS_STYLES.new).label}
                            </Badge>
                          </div>
                          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {job.before_photos?.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Before
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  {job.before_photos.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer">
                                      <img src={url} alt={`before-${i}`} className="aspect-square object-cover rounded-lg w-full hover:opacity-90 transition-opacity shadow-sm" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {job.after_photos?.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> After
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  {job.after_photos.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer">
                                      <img src={url} alt={`after-${i}`} className="aspect-square object-cover rounded-lg w-full hover:opacity-90 transition-opacity shadow-sm" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Wallet */}
                {activeTab === "wallet" && (
                  <div className="text-center py-16 text-slate-400">
                    <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No wallet information available.</p>
                  </div>
                )}

                {/* Referral */}
                {activeTab === "referral" && (
                  <div className="max-w-lg">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                      <Gift className="w-10 h-10 mb-3" style={{ color: accentColor }} />
                      <h2 className="text-lg font-bold text-slate-800 mb-2">Referral Program</h2>
                      <p className="text-slate-600 text-sm mb-4">
                        {company?.portal_settings?.referral_message || "Share us with a friend and we'll take care of them just like we take care of you!"}
                      </p>
                      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-mono text-slate-600 truncate">
                          {customer.first_name?.toLowerCase()}-{customer.last_name?.toLowerCase()}-referral
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/Booking?ref=${customer.first_name?.toLowerCase()}-${customer.last_name?.toLowerCase()}`)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-md text-white flex-shrink-0"
                          style={{ backgroundColor: accentColor }}
                        >
                          Copy link
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
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

                {/* Book */}
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
                            {services.length > 0 ? (
                              <select
                                required
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={bookingForm.service_type}
                                onChange={e => setBookingForm({ ...bookingForm, service_type: e.target.value })}
                              >
                                <option value="">Select a service...</option>
                                {services.map(svc => (
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
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}