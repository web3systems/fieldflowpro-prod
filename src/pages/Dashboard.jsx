import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Briefcase, Users, DollarSign, TrendingUp,
  Clock, CheckCircle, AlertCircle, Plus,
  ArrowRight, Calendar, Building2, CalendarCheck, CreditCard, FileText, Mic
} from "lucide-react";
import HenryModal from "../components/henry/HenryModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import OnboardingBanner from "../components/dashboard/OnboardingBanner";
import RevenueChart from "../components/dashboard/RevenueChart";
import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import GlobalSearch from "../components/dashboard/GlobalSearch";
import WorkflowStages from "../components/dashboard/WorkflowStages";
import BusinessPerformance from "../components/dashboard/BusinessPerformance";

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  scheduled: "bg-purple-100 text-purple-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// A job is "scheduled on" a date if its main scheduled_start falls on that date
// OR any of its appointments (multi-visit schedule) fall on that date.
function jobScheduledOnDate(job, dateStr) {
  const matches = (val) => {
    if (!val) return false;
    try { return format(new Date(val), "yyyy-MM-dd") === dateStr; } catch { return false; }
  };
  return matches(job.scheduled_start) || (job.appointments || []).some(a => matches(a.scheduled_start));
}

export default function Dashboard() {
  const { activeCompany, companies, companiesLoading, user: appUser, companyRole } = useApp();
  const isFieldServiceManager = companyRole === 'field_service_manager';
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [myTech, setMyTech] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [henryOpen, setHenryOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeCompany) {
      loadData();
    }
  }, [activeCompany]);

  useEffect(() => {
    if (!activeCompany) return;
    const unsub = base44.entities.Invoice.subscribe((event) => {
      if (event.type === "update" || event.type === "create") {
        if (event.data?.company_id !== activeCompany.id) return;
        setInvoices(prev => {
          const exists = prev.find(i => i.id === event.id);
          if (exists) return prev.map(i => i.id === event.id ? event.data : i);
          return [...prev, event.data];
        });
      } else if (event.type === "delete") {
        setInvoices(prev => prev.filter(i => i.id !== event.id));
      }
    });
    return unsub;
  }, [activeCompany]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Check if onboarding was previously dismissed
      if (u?.onboarding_dismissed) {
        setOnboardingDismissed(true);
      }
    }).catch(() => {});
  }, []);

  // Also check localStorage on mount as a fast cache
  useEffect(() => {
    if (activeCompany) {
      const key = `onboarding_dismissed_${activeCompany.id}`;
      if (localStorage.getItem(key) === '1') {
        setOnboardingDismissed(true);
      }
    }
  }, [activeCompany]);

  async function handleDismissOnboarding() {
    setOnboardingDismissed(true);
    if (activeCompany) {
      localStorage.setItem(`onboarding_dismissed_${activeCompany.id}`, '1');
    }
    try {
      await base44.auth.updateMe({ onboarding_dismissed: true });
    } catch (_) { /* silent */ }
  }

  async function loadData() {
    setLoading(true);
    const [j, c, inv, l, b, est] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.Lead.filter({ company_id: activeCompany.id }),
      base44.entities.ServiceBooking.filter({ company_id: activeCompany.id, status: "pending" }, "-created_date"),
      base44.entities.Estimate.filter({ company_id: activeCompany.id }),
    ]);
    setJobs(j);
    setCustomers(c);
    setInvoices(inv);
    setLeads(l);
    setBookings(b);
    setEstimates(est);

    // Check email settings and Stripe for onboarding banner
    try {
      const emailSettings = await base44.entities.CompanyEmailSettings.filter({ company_id: activeCompany.id });
      setEmailConfigured(emailSettings.length > 0 && emailSettings[0].mail_enabled);
    } catch (_) {
      setEmailConfigured(false);
    }
    setStripeConnected(!!activeCompany.stripe_onboarding_complete);

    // Only show onboarding wizard if company has no real data yet
    const key = `onboarding_done_${activeCompany.id}`;
    const alreadyDone = localStorage.getItem(key);
    const hasExistingData = j.length > 0 || c.length > 0 || inv.length > 0;
    if (!alreadyDone && !hasExistingData) {
      setShowOnboarding(true);
    } else if (hasExistingData && !alreadyDone) {
      // Mark as done so wizard never shows for established companies
      localStorage.setItem(key, "1");
    }

    // Find if current user is a technician
    const techs = await base44.entities.Technician.filter({ company_id: activeCompany.id });
    const me = await base44.auth.me();
    const myT = techs.find(t => t.email === me?.email);
    setMyTech(myT || null);
    setLoading(false);
  }

  const myJobs = myTech ? jobs.filter(j => j.assigned_techs?.includes(myTech.id) && ["new","scheduled","in_progress"].includes(j.status)) : [];
  const activeJobs = jobs.filter(j => ["in_progress", "scheduled", "new"].includes(j.status));
  const todayJobs = jobs.filter(j => jobScheduledOnDate(j, format(new Date(), "yyyy-MM-dd")));
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const pendingRevenue = invoices.filter(i => ["sent", "viewed", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
  const newLeads = leads.filter(l => l.status === "new").length;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayPaidInvoices = invoices.filter(i =>
    i.status === "paid" && i.paid_date && i.paid_date.startsWith(todayStr)
  );
  const todayPaymentsTotal = todayPaidInvoices.reduce((s, i) => s + (i.total || 0), 0);

  // Recent activity: mix of recent jobs AND recent paid invoices, sorted by date
  const recentActivity = [
    ...jobs.map(j => ({ type: "job", date: j.updated_date || j.created_date, data: j })),
    ...invoices.filter(i => i.status === "paid").map(i => ({ type: "payment", date: i.paid_date || i.updated_date, data: i })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  if (companiesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading your workspace…</p>
      </div>
    );
  }

  if (!activeCompany) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-16">
        <Building2 className="w-14 h-14 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-700 mb-2">No company found</h2>
        <p className="text-slate-500 text-sm mb-6">
          Your account isn't linked to a company yet. This can happen if your invitation hasn't been fully set up.
          Please contact your administrator or try signing out and back in.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
          <Button onClick={() => base44.auth.logout('/')}>Sign Out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20 lg:pb-6">
      {/* Henry Modal */}
      {henryOpen && (
        <HenryModal
          onClose={() => setHenryOpen(false)}
          company={activeCompany}
          user={user || appUser}
        />
      )}

      {showOnboarding && activeCompany && (
        <OnboardingWizard
          company={activeCompany}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-4 space-y-6">

        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">{activeCompany?.name} — here's your workflow at a glance.</p>
        </div>

        {/* Global Search */}
        <GlobalSearch
          jobs={jobs}
          customers={customers}
          invoices={invoices}
          leads={leads}
          estimates={estimates}
        />

        <OnboardingBanner company={activeCompany} customers={customers} jobs={jobs} emailConfigured={emailConfigured} stripeConnected={stripeConnected} dismissed={onboardingDismissed} onDismiss={handleDismissOnboarding} />

        {/* Henry AI Banner */}
        <button
          onClick={() => setHenryOpen(true)}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all hover:brightness-110 active:scale-[0.99] focus:outline-none shadow-sm"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)' }}>
            <Mic className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-amber-400 font-semibold text-sm tracking-wide">Henry AI Assistant</p>
            <p className="text-slate-300 text-xs mt-0.5">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} — tap to start your briefing</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-slate-400 text-xs">Active</span>
          </div>
        </button>

        {/* Workflow Stage Cards: Requests → Quotes → Jobs → Invoices */}
        <WorkflowStages
          bookings={bookings}
          estimates={estimates}
          jobs={jobs}
          invoices={invoices}
          loading={loading}
        />

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "New Estimate", icon: Plus, link: createPageUrl("NewEstimate") },
            { label: "Schedule", icon: Calendar, link: createPageUrl("Schedule") },
            { label: "Customers", icon: Users, link: createPageUrl("Customers") },
            { label: "Leads", icon: TrendingUp, link: createPageUrl("Leads") },
          ].map(({ label, icon: Icon, link }) => (
            <Link key={label} to={link}>
              <div className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl text-white font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.97] shadow-md"
                style={{ background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)" }}>
                <Icon className="w-6 h-6" strokeWidth={1.5} />
                {label}
              </div>
            </Link>
          ))}
        </div>

        {/* My Jobs (for technicians) */}
        {myTech && myJobs.length > 0 && (
          <Card className="shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
            <CardHeader className="px-4 py-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" /> My Assigned Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {myJobs.map(job => {
                  const cust = customers.find(c => c.id === job.customer_id);
                  return (
                    <Link key={job.id} to={`/JobDetail/${job.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
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

        {/* Two-column: Today's Appointments + Business Performance sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today's Appointments */}
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Today's Appointments
                  </CardTitle>
                  <Link to={createPageUrl("Schedule")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    View schedule <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
                ) : todayJobs.length === 0 ? (
                  <div className="py-10 text-center">
                    <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">No appointments today</p>
                    <p className="text-xs text-slate-400 mt-0.5">Enjoy the breather or schedule a new job.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {todayJobs.slice(0, 8).map(job => {
                      const cust = customers.find(c => c.id === job.customer_id);
                      return (
                        <Link key={job.id} to={`/JobDetail/${job.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="w-1.5 h-10 rounded-full bg-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {cust && <span className="text-xs text-slate-500">{cust.first_name} {cust.last_name}</span>}
                              {job.scheduled_start && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(job.scheduled_start), "h:mm a")}</span>}
                              {job.address && <span className="text-xs text-slate-400 truncate">{job.address}</span>}
                            </div>
                          </div>
                          <Badge className={`text-xs flex-shrink-0 ${statusColors[job.status] || "bg-gray-100 text-gray-600"}`}>{job.status?.replace("_", " ")}</Badge>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Business Performance Sidebar */}
          <div className="lg:col-span-1">
            <BusinessPerformance invoices={invoices} jobs={jobs} loading={loading} />
          </div>
        </div>

        {/* Pending Bookings */}
        {bookings.length > 0 && (
          <Card className="border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
            <CardHeader className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-blue-600" />
                  New Service Bookings
                  <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{bookings.length}</span>
                </CardTitle>
                <Link to={createPageUrl("Schedule")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  View in Schedule <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {bookings.slice(0, 5).map(booking => (
                  <div key={booking.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <CalendarCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{booking.first_name} {booking.last_name}</p>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{booking.service_type}</span>
                        {booking.preferred_date && <span className="text-xs text-slate-400">📅 {booking.preferred_date}{booking.preferred_time ? ` at ${booking.preferred_time}` : ""}</span>}
                        {booking.phone && <span className="text-xs text-slate-400">📞 {booking.phone}</span>}
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 text-xs flex-shrink-0">Pending</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isFieldServiceManager && <RevenueChart invoices={invoices} />}

        {!isFieldServiceManager && (
          <Card className="border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Today's Payments</p>
                  <p className="text-xs text-slate-400">{todayPaidInvoices.length} invoice{todayPaidInvoices.length !== 1 ? "s" : ""} paid today</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">${todayPaymentsTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                <Link to={createPageUrl("Invoices")} className="text-xs text-blue-600 hover:underline flex items-center gap-1 justify-end mt-0.5">
                  View invoices <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}