import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Home, FileText, DollarSign, Calendar, User,
  CheckCircle, AlertCircle, Phone, Mail, MapPin,
  LogOut, Briefcase, ChevronDown, Building2, PlusCircle,
  ThumbsUp, ThumbsDown, ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

export default function CustomerPortal() {
  const [user, setUser] = useState(null);
  // All customer records for this user (one per company they belong to)
  const [allAccounts, setAllAccounts] = useState([]); // [{customer, company}]
  const [activeIndex, setActiveIndex] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [bookingForm, setBookingForm] = useState({ service_type: "", preferred_date: "", preferred_time: "9:00 AM", notes: "" });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => { init(); }, []);

  // Reload data when switching companies
  useEffect(() => {
    if (allAccounts.length > 0) {
      loadAccountData(allAccounts[activeIndex].customer);
    }
  }, [activeIndex, allAccounts]);

  async function init() {
    try {
      const u = await base44.auth.me();
      setUser(u);

      // Find ALL customer records matching this user's email or portal_user_id
      const allCustomers = await base44.entities.Customer.list();
      const matched = allCustomers.filter(
        c => c.portal_user_id === u.id || c.email === u.email
      );

      if (matched.length === 0) {
        // If user has a staff role (not a customer), redirect to main app
        if (u?.role && u.role !== 'user') {
          window.location.href = '/Dashboard';
          return;
        }
        // Check if they might be a staff user with default 'user' role too
        // by seeing if they have UserCompanyAccess records
        const accessRecords = await base44.entities.UserCompanyAccess.filter({ user_email: u.email });
        if (accessRecords.length > 0) {
          window.location.href = '/Dashboard';
          return;
        }
        setLoading(false);
        return;
      }

      // Load all companies for matched customers
      const allCompanies = await base44.entities.Company.list();
      const companyMap = Object.fromEntries(allCompanies.map(c => [c.id, c]));

      const accounts = matched.map(customer => ({
        customer,
        company: companyMap[customer.company_id] || null,
      }));

      setAllAccounts(accounts);
      // loadAccountData is called via useEffect when allAccounts is set
    } catch (e) {
      base44.auth.redirectToLogin();
    }
    setLoading(false);
  }

  async function loadAccountData(customer) {
    const [j, inv, est] = await Promise.all([
      base44.entities.Job.filter({ customer_id: customer.id }),
      base44.entities.Invoice.filter({ customer_id: customer.id }),
      base44.entities.Estimate.filter({ customer_id: customer.id }),
    ]);
    setJobs(j);
    setInvoices(inv);
    setEstimates(est);
  }

  const activeAccount = allAccounts[activeIndex] || null;
  const customer = activeAccount?.customer || null;
  const company = activeAccount?.company || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center shadow-lg border-0">
          <CardContent className="p-8">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Account Not Found</h2>
            <p className="text-slate-500 text-sm mb-6">
              We couldn't find a customer account linked to your email. Please contact us for access.
            </p>
            <Button onClick={() => base44.auth.logout()} variant="outline" className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingJobs = jobs.filter(j => ["scheduled", "new"].includes(j.status));
  const pendingInvoices = invoices.filter(i => ["sent", "viewed", "overdue"].includes(i.status));
  const totalOwed = pendingInvoices.reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);
  const accentColor = company?.primary_color || "#2563eb";
  // Always use a clean dark header regardless of company brand color
  const headerColor = "#1e293b";

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
    await base44.functions.invoke('submitBooking', {
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

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "book", label: "Book", icon: PlusCircle },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "invoices", label: "Invoices", icon: DollarSign },
    { id: "estimates", label: "Estimates", icon: FileText },
    { id: "account", label: "Account", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="px-4 pt-3 pb-4 text-white" style={{ backgroundColor: headerColor }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between pb-1">
            {/* Company switcher (or static name if only one) */}
            {allAccounts.length > 1 ? (
              <div className="relative">
                <button
                  onClick={() => setSwitcherOpen(o => !o)}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-sm font-semibold text-white">{company?.name || "Select Company"}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/80" />
                </button>
                {switcherOpen && (
                  <div className="absolute top-10 left-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 min-w-[220px] overflow-hidden">
                    <p className="text-xs font-semibold text-slate-400 px-4 pt-3 pb-1">Your Accounts</p>
                    {allAccounts.map(({ customer: c, company: co }, idx) => (
                      <button
                        key={c.id}
                        onClick={() => { setActiveIndex(idx); setSwitcherOpen(false); setActiveTab("home"); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${idx === activeIndex ? "bg-slate-50" : ""}`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: co?.primary_color || "#3b82f6" }}
                        >
                          {co?.name?.[0] || "?"}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-800">{co?.name || "Unknown Company"}</p>
                          <p className="text-xs text-slate-400 capitalize">{co?.industry || ""}</p>
                        </div>
                        {idx === activeIndex && (
                          <CheckCircle className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white/80 text-sm font-medium">{company?.name || "Customer Portal"}</p>
            )}

            <button
              onClick={() => base44.auth.logout()}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>

          <h1 className="text-xl font-bold mt-1">Hi, {customer.first_name}!</h1>

          {/* Quick stats */}
          <div className="flex gap-3 mt-3">
            <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{upcomingJobs.length}</p>
              <p className="text-xs text-white/70">Upcoming Jobs</p>
            </div>
            <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{pendingInvoices.length}</p>
              <p className="text-xs text-white/70">Pending Invoices</p>
            </div>
            {totalOwed > 0 && (
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">${totalOwed.toFixed(0)}</p>
                <p className="text-xs text-white/70">Balance Due</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dismiss switcher on outside click */}
      {switcherOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
      )}

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {activeTab === "home" && (
          <>
            {upcomingJobs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Upcoming Services</h2>
                <div className="space-y-2">
                  {upcomingJobs.slice(0, 3).map(job => {
                    const statusInfo = STATUS_STYLES[job.status] || STATUS_STYLES.new;
                    return (
                      <Card key={job.id} className="border-0 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-800">{job.title}</p>
                              {job.scheduled_start && (
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(job.scheduled_start), "EEE, MMM d · h:mm a")}
                                </p>
                              )}
                              {job.address && (
                                <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 mt-0.5 flex items-center gap-1 hover:underline">
                                  <MapPin className="w-3 h-3" />{job.address}
                                </a>
                              )}
                            </div>
                            <Badge className={`text-xs ${statusInfo.color} flex-shrink-0`}>{statusInfo.label}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {pendingInvoices.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Invoices Due</h2>
                <div className="space-y-2">
                  {pendingInvoices.slice(0, 3).map(inv => (
                    <Card key={inv.id} className="border-0 shadow-sm cursor-pointer" onClick={() => setActiveTab("invoices")}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{inv.invoice_number}</p>
                            {inv.due_date && (
                              <p className="text-xs text-slate-500 mt-0.5">Due {format(new Date(inv.due_date), "MMM d, yyyy")}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">${(inv.total || 0).toFixed(2)}</p>
                            <Badge className={`text-xs mt-1 ${INVOICE_STATUS[inv.status]?.color || "bg-gray-100 text-gray-600"}`}>
                              {INVOICE_STATUS[inv.status]?.label || inv.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {upcomingJobs.length === 0 && pendingInvoices.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700">You're all caught up!</p>
                  <p className="text-slate-400 text-sm mt-1">No upcoming jobs or pending invoices.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "jobs" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Your Jobs</h2>
            {jobs.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-slate-400">No service history yet.</CardContent>
              </Card>
            ) : (
              jobs.map(job => {
                const statusInfo = STATUS_STYLES[job.status] || STATUS_STYLES.new;
                return (
                  <Card key={job.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800">{job.title}</p>
                            <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          </div>
                          {job.scheduled_start && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(job.scheduled_start), "EEE, MMM d, yyyy · h:mm a")}
                            </p>
                          )}
                          {job.address && (
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{job.address}
                            </p>
                          )}
                          {job.description && (
                            <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 p-2 rounded-lg">{job.description}</p>
                          )}
                        </div>
                        {job.total_amount > 0 && (
                          <p className="text-sm font-bold text-slate-700 flex-shrink-0">${job.total_amount}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
            {invoices.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-slate-400">No invoices yet.</CardContent>
              </Card>
            ) : (
              invoices.map(inv => {
                const statusInfo = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent;
                return (
                  <Card key={inv.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-slate-800">{inv.invoice_number}</p>
                          {inv.due_date && (
                            <p className="text-xs text-slate-500 mt-0.5">Due {format(new Date(inv.due_date), "MMM d, yyyy")}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-800">${(inv.total || 0).toFixed(2)}</p>
                          <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                      </div>
                      {inv.line_items?.length > 0 && (
                        <div className="space-y-1 border-t border-slate-100 pt-2">
                          {inv.line_items.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs text-slate-600">
                              <span>{item.description}</span>
                              <span>${(item.total || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {inv.status !== "paid" && inv.total > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-center">
                          <p className="text-xs text-blue-700 font-medium">To pay, contact {company?.name}</p>
                          {company?.phone && (
                            <a href={`tel:${company.phone}`} className="text-sm text-blue-600 font-semibold mt-1 flex items-center justify-center gap-1">
                              <Phone className="w-3.5 h-3.5" />{company.phone}
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {activeTab === "book" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Request a Service</h2>
            {bookingSubmitted ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700">Request Submitted!</p>
                  <p className="text-slate-400 text-sm mt-1">We'll confirm your appointment soon.</p>
                  <button onClick={() => { setBookingSubmitted(false); setBookingForm({ service_type: "", preferred_date: "", preferred_time: "9:00 AM", notes: "" }); }} className="mt-4 text-sm font-medium text-blue-600">Book Another</button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <form onSubmit={submitBookingRequest} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">What service do you need? *</label>
                      <input required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={bookingForm.service_type} onChange={e => setBookingForm({ ...bookingForm, service_type: e.target.value })} placeholder="e.g. Lawn mowing, Deep clean..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Preferred Date *</label>
                      <input required type="date" min={new Date().toISOString().split("T")[0]} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={bookingForm.preferred_date} onChange={e => setBookingForm({ ...bookingForm, preferred_date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Preferred Time</label>
                      <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={bookingForm.preferred_time} onChange={e => setBookingForm({ ...bookingForm, preferred_time: e.target.value })}>
                        {["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
                      <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} value={bookingForm.notes} onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })} placeholder="Any special instructions..." />
                    </div>
                    <button type="submit" disabled={bookingLoading} className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60" style={{ backgroundColor: headerColor }}>
                      {bookingLoading ? "Sending..." : "Send Request"}
                    </button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "estimates" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Estimates</h2>
            {estimates.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-slate-400">No estimates yet.</CardContent>
              </Card>
            ) : (
              estimates.map(est => (
                <Card key={est.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-800">{est.title}</p>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">{est.estimate_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">${(est.total || 0).toFixed(2)}</p>
                        <Badge className={`text-xs capitalize ${
                          est.status === 'approved' ? 'bg-green-100 text-green-700' :
                          est.status === 'declined' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{est.status}</Badge>
                      </div>
                    </div>
                    {est.line_items?.length > 0 && (
                      <div className="space-y-1 border-t border-slate-100 pt-2">
                        {est.line_items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-600">
                            <span>{item.description}</span>
                            <span>${(item.total || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {est.valid_until && (
                      <p className="text-xs text-slate-400 mt-2">Valid until {format(new Date(est.valid_until), "MMM d, yyyy")}</p>
                    )}
                    {["sent", "viewed", "draft"].includes(est.status) && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <button onClick={() => approveEstimate(est)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                          <ThumbsUp className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => declineEstimate(est)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
                          <ThumbsDown className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "account" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">My Account</h2>

            {/* Profile card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                    {customer.first_name?.[0]}{customer.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{customer.first_name} {customer.last_name}</p>
                    <p className="text-slate-500 text-sm">{user?.email}</p>
                  </div>
                </div>
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700">
                    <Phone className="w-4 h-4" />{customer.phone}
                  </a>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span>{customer.address}{customer.city ? `, ${customer.city}` : ""}{customer.state ? `, ${customer.state}` : ""}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All linked companies */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm">
                  {allAccounts.length > 1 ? "Your Service Providers" : "Your Service Provider"}
                </h3>
                <div className="space-y-3">
                  {allAccounts.map(({ company: co }, idx) => co && (
                    <button
                      key={co.id}
                      onClick={() => { setActiveIndex(idx); setActiveTab("home"); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${idx === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"}`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: co.primary_color || "#3b82f6" }}
                      >
                        {co.name[0]}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-slate-800 text-sm">{co.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{co.industry}</p>
                      </div>
                      {idx === activeIndex && (
                        <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => base44.auth.logout()} variant="outline" className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="flex max-w-lg mx-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === id ? "text-blue-600" : "text-slate-400"
              }`}
              style={activeTab === id ? { color: headerColor } : {}}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}