import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Home, FileText, DollarSign, Calendar, User,
  CheckCircle, Clock, AlertCircle, ChevronRight,
  Phone, Mail, MapPin, LogOut, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  paid: { label: "Paid", color: "bg-green-100 text-green-700" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700" },
};

export default function CustomerPortal() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const u = await base44.auth.me();
      setUser(u);
      // Find customer by portal_user_id or email
      const customers = await base44.entities.Customer.list();
      const found = customers.find(c => c.portal_user_id === u.id || c.email === u.email);
      if (found) {
        setCustomer(found);
        const [j, inv, est, companies] = await Promise.all([
          base44.entities.Job.filter({ customer_id: found.id }),
          base44.entities.Invoice.filter({ customer_id: found.id }),
          base44.entities.Estimate.filter({ customer_id: found.id }),
          base44.entities.Company.filter({ id: found.company_id }),
        ]);
        setJobs(j);
        setInvoices(inv);
        setEstimates(est);
        setCompany(companies[0] || null);
      }
    } catch (e) {
      base44.auth.redirectToLogin();
    }
    setLoading(false);
  }

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

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "invoices", label: "Invoices", icon: DollarSign },
    { id: "estimates", label: "Estimates", icon: FileText },
    { id: "account", label: "Account", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div
        className="px-4 pt-safe-top pb-4 text-white"
        style={{ backgroundColor: company?.primary_color || "#1e40af" }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between pt-3 pb-1">
            <div>
              <p className="text-white/70 text-sm">{company?.name || "Customer Portal"}</p>
              <h1 className="text-xl font-bold">Hi, {customer.first_name}!</h1>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>

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
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {job.address}
                                </p>
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
                    <Card key={inv.id} className="border-0 shadow-sm cursor-pointer" onClick={() => { setSelectedInvoice(inv); setActiveTab("invoices"); }}>
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
                        <Badge className="text-xs capitalize bg-blue-100 text-blue-700">{est.status}</Badge>
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
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "account" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">My Account</h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                    {customer.first_name?.[0]}{customer.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{customer.first_name} {customer.last_name}</p>
                    <p className="text-slate-500 text-sm">Customer</p>
                  </div>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {customer.email}
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {customer.phone}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span>{customer.address}{customer.city ? `, ${customer.city}` : ""}{customer.state ? `, ${customer.state}` : ""}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {company && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-slate-700 mb-3 text-sm">Your Service Provider</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: company.primary_color || "#3b82f6" }}
                    >
                      {company.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{company.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{company.industry}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {company.phone && (
                      <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-sm text-blue-600">
                        <Phone className="w-4 h-4" />{company.phone}
                      </a>
                    )}
                    {company.email && (
                      <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-sm text-blue-600">
                        <Mail className="w-4 h-4" />{company.email}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={() => base44.auth.logout()} variant="outline" className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom">
        <div className="flex max-w-lg mx-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === id ? "text-blue-600" : "text-slate-400"
              }`}
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