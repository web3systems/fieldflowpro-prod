import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PLANS } from '@/lib/subscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Users, DollarSign, TrendingUp, BookOpen, Ticket,
  Bell, CheckCircle, XCircle, Mail, CreditCard, Zap, Upload,
  Megaphone, RefreshCw, Search, UserPlus, Briefcase, Building2
} from 'lucide-react';
import { format } from 'date-fns';
import SupportTicketsTab from '@/components/saas-admin/SupportTicketsTab';
import PlatformMetricsTab from '@/components/saas-admin/PlatformMetricsTab';
import CustomersTab from '@/components/saas-admin/CustomersTab';
import DocManagerTab from '@/components/saas-admin/DocManagerTab';
import CompanyStripeRow from '@/components/settings/CompanyStripeRow';
import HouseCallProImport from '@/components/admin/HouseCallProImport';
import AnnouncementSender from '@/components/admin/AnnouncementSender';

export default function SaaSAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [approveDialog, setApproveDialog] = useState(null);
  const [approveCompanyIds, setApproveCompanyIds] = useState([]);
  const [approveRole, setApproveRole] = useState('standard');
  const [approvingId, setApprovingId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchUsers, setSearchUsers] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [u, cos, subs, tickets, allUsers, access, reqs] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.Company.list(),
      base44.entities.Subscription.list(),
      base44.entities.Ticket.list(),
      base44.entities.User.list(),
      base44.entities.UserCompanyAccess.list(),
      base44.entities.AccessRequest.filter({ status: 'pending' }),
    ]);

    setCurrentUser(u);
    setCompanies(cos);
    setSubscriptions(subs);
    setAccessRequests(reqs);
    setUsers(allUsers);
    setAccessRecords(access);

    const masterCompanies = cos.filter(c => !c.parent_company_id);
    const masterIds = new Set(masterCompanies.map(c => c.id));
    const activeRevenue = subs
      .filter(s => (s.status === 'active' || s.status === 'trialing') && masterIds.has(s.company_id))
      .reduce((sum, s) => sum + ({ starter: 69, growth: 149, professional: 149, pro: 299, enterprise: 299 }[s.plan] || 0), 0);

    setStats({
      activeCompanies: masterCompanies.filter(c => c.is_active).length,
      totalRevenue: activeRevenue.toFixed(0),
      openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      totalUsers: allUsers.length,
      pendingRequests: reqs.length,
    });
    setLoading(false);
  }

  async function openApprove(req) {
    setApproveDialog(req);
    setApproveCompanyIds([]);
    setApproveRole('standard');
  }

  async function handleApprove() {
    const req = approveDialog;
    setApprovingId(req.id);
    const assignments = approveCompanyIds.map(cid => {
      const c = companies.find(co => co.id === cid);
      return { company_id: cid, company_name: c?.name || '', role: approveRole };
    });
    await base44.functions.invoke('inviteTeamMember', {
      first_name: (req.name || req.email).split(' ')[0],
      last_name: (req.name || '').split(' ').slice(1).join(' ') || '',
      email: req.email,
      password: null,
      assignments,
    }).catch(e => console.error('Approval invite error:', e));
    await base44.entities.AccessRequest.update(req.id, {
      status: 'approved', reviewed_by: currentUser?.email, assigned_company_ids: approveCompanyIds,
    });
    setApproveDialog(null);
    setApprovingId(null);
    await loadAll();
  }

  async function handleDecline(req) {
    await base44.entities.AccessRequest.update(req.id, { status: 'declined', reviewed_by: currentUser?.email });
    await loadAll();
  }

  const pendingCount = stats?.pendingRequests || 0;
  const nonAdminUsers = users.filter(u => u.role !== 'admin' && u.role !== 'super_admin');
  const filteredUsers = nonAdminUsers.filter(u =>
    (u.full_name || u.email || '').toLowerCase().includes(searchUsers.toLowerCase())
  );

  const statCards = [
    { label: 'Active Companies', value: stats?.activeCompanies ?? '—', icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Est. MRR', value: stats ? `$${Number(stats.totalRevenue).toLocaleString()}` : '—', icon: DollarSign, color: 'text-green-600' },
    { label: 'Open Tickets', value: stats?.openTickets ?? '—', icon: Ticket, color: 'text-orange-600' },
    { label: 'Platform Users', value: stats?.totalUsers ?? '—', icon: Users, color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
            <p className="text-slate-500 text-sm mt-0.5">SaaS admin — all companies and users</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Pending Requests Banner */}
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800">{pendingCount} pending access request{pendingCount > 1 ? 's' : ''}</p>
              <p className="text-sm text-amber-600">New users waiting for approval.</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{loading ? '—' : value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue={pendingCount > 0 ? 'requests' : 'customers'}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Access Requests
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Subscriptions
            </TabsTrigger>
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Docs
            </TabsTrigger>
            <TabsTrigger value="stripe" className="gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Stripe Connect
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Import
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1.5">
              <Megaphone className="w-3.5 h-3.5" /> Announcements
            </TabsTrigger>
          </TabsList>

          {/* CUSTOMERS */}
          <TabsContent value="customers">
            <Card><CardContent className="pt-6"><CustomersTab /></CardContent></Card>
          </TabsContent>

          {/* ACCESS REQUESTS */}
          <TabsContent value="requests" className="mt-4 space-y-3">
            {accessRequests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700">No pending requests</p>
                  <p className="text-sm text-slate-400 mt-1">All access requests have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              accessRequests.map(req => (
                <Card key={req.id} className="border-l-4 border-l-amber-400">
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
                          <p className="text-xs text-slate-400 mt-1">
                            {req.created_date ? format(new Date(req.created_date), "MMM d, yyyy 'at' h:mm a") : 'recently'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => openApprove(req)} disabled={approvingId === req.id}>
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDecline(req)}>
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* SUBSCRIPTIONS */}
          <TabsContent value="subscriptions" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="px-4 py-4 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> All Company Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {companies.filter(c => !c.parent_company_id).map(co => {
                  const sub = subscriptions.find(s => s.company_id === co.id);
                  const plan = PLANS[sub?.plan || 'trial'];
                  const statusColors = {
                    active: 'bg-green-100 text-green-700',
                    trialing: 'bg-blue-100 text-blue-700',
                    past_due: 'bg-amber-100 text-amber-700',
                    cancelled: 'bg-red-100 text-red-700',
                  };
                  return (
                    <div key={co.id} className="flex items-center gap-4 px-4 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: co.primary_color || '#3b82f6' }}>
                        {co.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{co.name}</p>
                        <p className="text-xs text-slate-400">{sub?.owner_email || 'No owner'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-slate-700">{plan?.name || '—'}</p>
                        <p className="text-xs text-slate-400">${plan?.price || 0}/mo</p>
                      </div>
                      <Badge className={statusColors[sub?.status] || 'bg-slate-100 text-slate-500'}>
                        {sub?.status || 'no sub'}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-4">
              {['starter', 'professional', 'enterprise'].map(planKey => {
                const count = subscriptions.filter(s => s.plan === planKey && ['active', 'trialing'].includes(s.status)).length;
                const mrr = count * (PLANS[planKey]?.price || 0);
                return (
                  <Card key={planKey}>
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{PLANS[planKey]?.name || planKey}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                      <p className="text-sm text-green-600 font-medium">${mrr.toLocaleString()}/mo</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* SUPPORT TICKETS */}
          <TabsContent value="tickets">
            <SupportTicketsTab />
          </TabsContent>

          {/* METRICS */}
          <TabsContent value="metrics">
            <PlatformMetricsTab />
          </TabsContent>

          {/* DOCS */}
          <TabsContent value="docs">
            <Card><CardContent className="pt-6"><DocManagerTab /></CardContent></Card>
          </TabsContent>

          {/* STRIPE CONNECT */}
          <TabsContent value="stripe" className="mt-4">
            <Card>
              <CardHeader className="px-4 py-4 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-violet-500" /> Stripe Connect — Per Company
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">Each company can connect their own Stripe account for direct customer payments.</p>
              </CardHeader>
              <CardContent className="p-0">
                {companies.length === 0
                  ? <p className="p-6 text-center text-slate-400 text-sm">No companies yet.</p>
                  : companies.filter(c => !c.parent_company_id).map(co => <CompanyStripeRow key={co.id} company={co} />)
                }
              </CardContent>
            </Card>
          </TabsContent>

          {/* IMPORT */}
          <TabsContent value="import" className="mt-4">
            <HouseCallProImport companies={companies} />
          </TabsContent>

          {/* ANNOUNCEMENTS */}
          <TabsContent value="announcements" className="mt-4">
            <AnnouncementSender companies={companies} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Access for {approveDialog?.name || approveDialog?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">Assign to one or more companies and choose their role.</p>
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
              {companies.filter(c => !c.parent_company_id).map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={approveCompanyIds.includes(c.id)}
                    onCheckedChange={checked =>
                      setApproveCompanyIds(prev => checked ? [...prev, c.id] : prev.filter(id => id !== c.id))
                    }
                  />
                  <div className="w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.primary_color || '#3b82f6' }}>
                    {c.name[0]}
                  </div>
                  <span className="text-sm font-medium">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={!!approvingId} className="bg-green-600 hover:bg-green-700 gap-2">
              <CheckCircle className="w-4 h-4" />
              {approvingId ? 'Approving...' : 'Approve & Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}