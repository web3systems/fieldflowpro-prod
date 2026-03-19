import { useState, useEffect } from "react";
import { PLANS } from "@/lib/subscription";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Building2, Users, CheckCircle, XCircle, Clock, Briefcase,
  DollarSign, UserPlus, Bell, RefreshCw, ChevronRight,
  ShieldCheck, TrendingUp, AlertTriangle, Search, Mail, CreditCard, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { format } from "date-fns";
import CompanyStripeRow from "@/components/settings/CompanyStripeRow";
import HouseCallProImport from "@/components/admin/HouseCallProImport";

export default function SuperAdminDashboard() {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [approveDialog, setApproveDialog] = useState(null); // { request }
  const [approveCompanyIds, setApproveCompanyIds] = useState([]);
  const [approveRole, setApproveRole] = useState("standard");
  const [searchUsers, setSearchUsers] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => setUser(u));
    loadAll();
    // Handle return from Stripe onboarding
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_return") === "true" || params.get("stripe_refresh") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function loadAll() {
    setLoading(true);
    const [cos, reqs, allUsers, access, allJobs, allInvoices, subs] = await Promise.all([
      base44.entities.Company.list(),
      base44.entities.AccessRequest.filter({ status: "pending" }),
      base44.entities.User.list(),
      base44.entities.UserCompanyAccess.list(),
      base44.entities.Job.list(),
      base44.entities.Invoice.list(),
      base44.entities.Subscription.list(),
    ]);
    setCompanies(cos);
    setAccessRequests(reqs);
    setUsers(allUsers);
    setAccessRecords(access);
    setJobs(allJobs);
    setInvoices(allInvoices);
    setSubscriptions(subs);
    setLoading(false);
  }

  async function openApprove(req) {
    setApproveDialog(req);
    setApproveCompanyIds([]);
    setApproveRole("standard");
  }

  async function handleApprove() {
    const req = approveDialog;
    setApprovingId(req.id);
    // Invite user
    await base44.users.inviteUser(req.email, "user");
    // Create access records for chosen companies
    for (const cid of approveCompanyIds) {
      const existing = accessRecords.find(a => a.user_email === req.email && a.company_id === cid);
      if (!existing) {
        await base44.entities.UserCompanyAccess.create({
          user_email: req.email,
          user_name: req.name || "",
          company_id: cid,
          role: approveRole,
        });
      }
    }
    await base44.entities.AccessRequest.update(req.id, { status: "approved", reviewed_by: user?.email, assigned_company_ids: approveCompanyIds });
    setApproveDialog(null);
    setApprovingId(null);
    await loadAll();
  }

  async function handleDecline(req) {
    await base44.entities.AccessRequest.update(req.id, { status: "declined", reviewed_by: user?.email });
    await loadAll();
  }

  async function handleRevokeAccess(userEmail) {
    const recs = accessRecords.filter(a => a.user_email === userEmail);
    await Promise.all(recs.map(r => base44.entities.UserCompanyAccess.delete(r.id)));
    await loadAll();
  }

  async function handleToggleCompanyAccess(userEmail, userName, companyId, checked) {
    if (checked) {
      await base44.entities.UserCompanyAccess.create({ user_email: userEmail, user_name: userName, company_id: companyId, role: "standard" });
    } else {
      const rec = accessRecords.find(a => a.user_email === userEmail && a.company_id === companyId);
      if (rec) await base44.entities.UserCompanyAccess.delete(rec.id);
    }
    await loadAll();
  }

  // Stats
  const pendingCount = accessRequests.length;
  const activeJobs = jobs.filter(j => ["new", "scheduled", "in_progress"].includes(j.status)).length;
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const pendingRevenue = invoices.filter(i => ["sent", "viewed", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);

  const nonAdminUsers = users.filter(u => u.role !== "admin" && u.role !== "super_admin");
  const filteredUsers = nonAdminUsers.filter(u =>
    (u.full_name || u.email).toLowerCase().includes(searchUsers.toLowerCase())
  );

  const stats = [
    { label: "Companies", value: companies.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Users", value: nonAdminUsers.length, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Jobs", value: activeJobs, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Revenue (Paid)", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Super Admin Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Platform-wide overview — all companies</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Pending Requests Banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">{pendingCount} Pending Access Request{pendingCount > 1 ? "s" : ""}</p>
            <p className="text-sm text-amber-600">New users are waiting for your approval to join the platform.</p>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-2 flex-shrink-0">
            <ChevronRight className="w-4 h-4" /> Review below
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900">{loading ? "—" : value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue={pendingCount > 0 ? "requests" : "overview"}>
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <Bell className="w-4 h-4" />
            Access Requests
            {pendingCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="stripe" className="gap-2">
            <CreditCard className="w-4 h-4" /> Stripe Connect
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <Zap className="w-4 h-4" /> Subscriptions
          </TabsTrigger>
        </TabsList>

        {/* ACCESS REQUESTS */}
        <TabsContent value="requests" className="mt-4 space-y-3">
          {accessRequests.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No pending requests</p>
                <p className="text-sm text-slate-400 mt-1">All access requests have been reviewed.</p>
              </CardContent>
            </Card>
          ) : (
            accessRequests.map(req => (
              <Card key={req.id} className="border-0 shadow-sm border-l-4 border-l-amber-400">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                        {(req.name || req.email)[0]?.toUpperCase()}
                      </div>
                      <div>
                        {req.name && <p className="font-semibold text-slate-900">{req.name}</p>}
                        <p className="text-sm text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{req.email}</p>
                        {req.message && <p className="text-sm text-slate-600 mt-1 italic">"{req.message}"</p>}
                        <p className="text-xs text-slate-400 mt-1">Requested {req.created_date ? format(new Date(req.created_date), "MMM d, yyyy 'at' h:mm a") : "recently"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                        onClick={() => openApprove(req)}
                        disabled={approvingId === req.id}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDecline(req)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue by company */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-4 py-4 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Revenue by Company
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {companies.map(co => {
                  const coInvoices = invoices.filter(i => i.company_id === co.id && i.status === "paid");
                  const rev = coInvoices.reduce((s, i) => s + (i.total || 0), 0);
                  const pending = invoices.filter(i => i.company_id === co.id && ["sent","viewed","overdue"].includes(i.status)).reduce((s,i) => s+(i.total||0),0);
                  return (
                    <div key={co.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: co.primary_color || "#3b82f6" }}>
                        {co.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{co.name}</p>
                        <p className="text-xs text-slate-400">${pending.toLocaleString()} pending</p>
                      </div>
                      <p className="text-sm font-bold text-green-600">${rev.toLocaleString()}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Jobs by company */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-4 py-4 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  Active Jobs by Company
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {companies.map(co => {
                  const coJobs = jobs.filter(j => j.company_id === co.id);
                  const active = coJobs.filter(j => ["new","scheduled","in_progress"].includes(j.status)).length;
                  const completed = coJobs.filter(j => j.status === "completed").length;
                  return (
                    <div key={co.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: co.primary_color || "#3b82f6" }}>
                        {co.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{co.name}</p>
                        <p className="text-xs text-slate-400">{completed} completed</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">{active} active</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to={createPageUrl("Companies")}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">Manage Companies</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl("Users")}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600">Manage Users</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl("Jobs")}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-violet-500" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-violet-600">All Jobs</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl("Reports")}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-orange-600">Reports</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users" className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={searchUsers} onChange={e => setSearchUsers(e.target.value)} placeholder="Search users..." className="pl-9" />
            </div>
            <Link to={createPageUrl("Users")}>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700" size="sm">
                <UserPlus className="w-4 h-4" /> Invite User
              </Button>
            </Link>
          </div>
          {filteredUsers.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-slate-400">No users found</CardContent></Card>
          ) : (
            filteredUsers.map(u => {
              const userAccess = accessRecords.filter(a => a.user_email === u.email);
              const userCompanies = companies.filter(c => userAccess.some(a => a.company_id === c.id));
              return (
                <Card key={u.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {(u.full_name || u.email)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {u.full_name && <p className="font-medium text-slate-900 truncate">{u.full_name}</p>}
                      <p className="text-sm text-slate-500 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex gap-1 flex-wrap justify-end max-w-xs">
                        {userCompanies.map(c => (
                          <span key={c.id} className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: c.primary_color || "#6b7280" }}>
                            {c.name}
                          </span>
                        ))}
                        {userCompanies.length === 0 && <span className="text-xs text-slate-400">No company access</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* COMPANIES */}
        <TabsContent value="companies" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {companies.map(co => {
              const coJobs = jobs.filter(j => j.company_id === co.id);
              const coInvoices = invoices.filter(i => i.company_id === co.id);
              const rev = coInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
              const activeJobCount = coJobs.filter(j => ["new","scheduled","in_progress"].includes(j.status)).length;
              const userCount = [...new Set(accessRecords.filter(a => a.company_id === co.id).map(a => a.user_email))].length;
              return (
                <Card key={co.id} className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: co.primary_color || "#3b82f6" }}>
                        {co.name[0]}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{co.name}</h3>
                        <p className="text-xs text-slate-500 capitalize">{co.industry}</p>
                      </div>
                      <Badge className={co.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {co.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-slate-800">{activeJobCount}</p>
                        <p className="text-xs text-slate-500">Active Jobs</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-slate-800">{userCount}</p>
                        <p className="text-xs text-slate-500">Users</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-green-600">${(rev/1000).toFixed(1)}k</p>
                        <p className="text-xs text-slate-500">Revenue</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        {/* STRIPE CONNECT */}
        <TabsContent value="stripe" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-4 py-4 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-500" />
                Stripe Connect — Per Company
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1">Each company can have its own Stripe account. Customer payments route directly to that account.</p>
            </CardHeader>
            <CardContent className="p-0">
              {companies.length === 0 ? (
                <p className="p-6 text-center text-slate-400 text-sm">No companies yet.</p>
              ) : (
                companies.map(co => <CompanyStripeRow key={co.id} company={co} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBSCRIPTIONS */}
        <TabsContent value="subscriptions" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-4 py-4 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                All Company Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {companies.length === 0 ? (
                <p className="p-6 text-center text-slate-400 text-sm">No companies yet.</p>
              ) : (
                companies.map(co => {
                  const sub = subscriptions.find(s => s.company_id === co.id);
                  const plan = PLANS[sub?.plan || "trial"];
                  const statusColors = {
                    active: "bg-green-100 text-green-700",
                    trialing: "bg-blue-100 text-blue-700",
                    past_due: "bg-amber-100 text-amber-700",
                    cancelled: "bg-red-100 text-red-700",
                  };
                  return (
                    <div key={co.id} className="flex items-center gap-4 px-4 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: co.primary_color || "#3b82f6" }}>
                        {co.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{co.name}</p>
                        <p className="text-xs text-slate-400">{sub?.owner_email || "No owner"}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-slate-700">{plan?.name}</p>
                        <p className="text-xs text-slate-400">${plan?.price || 0}/mo</p>
                      </div>
                      <Badge className={statusColors[sub?.status] || "bg-slate-100 text-slate-500"}>
                        {sub?.status || "no sub"}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* MRR summary */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            {["starter","professional","enterprise"].map(planKey => {
              const count = subscriptions.filter(s => s.plan === planKey && ["active","trialing"].includes(s.status)).length;
              const mrr = count * PLANS[planKey].price;
              return (
                <Card key={planKey} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{PLANS[planKey].name}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                    <p className="text-sm text-green-600 font-medium">${mrr.toLocaleString()}/mo</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Access for {approveDialog?.name || approveDialog?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">Assign this user to one or more companies and choose their role.</p>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={approveRole} onValueChange={setApproveRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to Companies</Label>
              {companies.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={approveCompanyIds.includes(c.id)}
                    onCheckedChange={(checked) =>
                      setApproveCompanyIds(prev => checked ? [...prev, c.id] : prev.filter(id => id !== c.id))
                    }
                  />
                  <div className="w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.primary_color || "#3b82f6" }}>
                    {c.name[0]}
                  </div>
                  <span className="text-sm font-medium">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
            <Button
              onClick={handleApprove}
              disabled={!!approvingId}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {approvingId ? "Approving..." : "Approve & Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}