import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Ticket, Users, DollarSign, TrendingUp } from 'lucide-react';
import SupportTicketsTab from '@/components/saas-admin/SupportTicketsTab';
import PlatformMetricsTab from '@/components/saas-admin/PlatformMetricsTab';
import CustomersTab from '@/components/saas-admin/CustomersTab';

export default function SaaSAdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const u = await base44.auth.me();
      
      // Only super admins can access
      if (u?.role !== 'super_admin' && u?.role !== 'admin') {
        throw new Error('Access denied');
      }

      setUser(u);

      // Load stats
      const [companies, subscriptions, tickets, users] = await Promise.all([
        base44.asServiceRole.entities.Company.list(),
        base44.asServiceRole.entities.Subscription.list(),
        base44.asServiceRole.entities.Ticket.list(),
        base44.asServiceRole.entities.User.list()
      ]);

      const activeCompanies = companies.filter(c => c.is_active).length;
      const totalRevenue = subscriptions
        .filter(s => s.status === 'active' || s.status === 'trialing')
        .reduce((sum, s) => {
          const planPrice = { starter: 49, professional: 99, enterprise: 199 };
          return sum + (planPrice[s.plan] || 0);
        }, 0);

      const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

      setStats({
        activeCompanies,
        totalRevenue: totalRevenue.toFixed(2),
        openTickets,
        totalUsers: users.length
      });
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return <div className="p-6 text-red-600">Access denied. Super admin only.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">SaaS Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Platform management and support</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeCompanies || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Live SaaS customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.totalRevenue || '0'}</div>
              <p className="text-xs text-slate-500 mt-1">Active subscriptions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.openTickets || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Pending support</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Platform-wide</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="customers" className="w-full">
          <TabsList>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="metrics">Platform Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card><CardContent className="pt-6"><CustomersTab /></CardContent></Card>
          </TabsContent>

          <TabsContent value="tickets">
            <SupportTicketsTab />
          </TabsContent>

          <TabsContent value="metrics">
            <PlatformMetricsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}