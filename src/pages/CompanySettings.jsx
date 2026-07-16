import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/layout.jsx';
import CompanyTeamTab from '@/components/settings/CompanyTeamTab';
import CompanyBillingTab from '@/components/settings/CompanyBillingTab';
import CustomerPortalSettingsTab from '@/components/settings/CustomerPortalSettingsTab';
import StripeConnectCard from '@/components/settings/StripeConnectCard';
import CompanyEmailSettingsTab from '@/components/settings/CompanyEmailSettingsTab';
import SubCompaniesTab from '@/components/settings/SubCompaniesTab';
import MarginRulesTab from '@/components/settings/MarginRulesTab';
import ConnectorsTab from '@/components/settings/ConnectorsTab';
import ApiWebhooksTab from '@/components/settings/ApiWebhooksTab';
import SeoAnalyticsTab from '@/components/settings/SeoAnalyticsTab';
import PwaInstallButton from '@/components/settings/PwaInstallButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Building2 } from 'lucide-react';

export default function CompanySettings() {
  const { activeCompany, user, refreshCompanies, companyRole } = useApp();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (activeCompany) loadCompany();
  }, [activeCompany?.id]);

  useEffect(() => {
    if (company?.id) {
      base44.entities.Subscription.filter({ company_id: company.id })
        .then(subs => setSubscription(subs[0] || null))
        .catch(() => {});
    }
  }, [company?.id]);

  async function loadCompany() {
    try {
      const companies = await base44.entities.Company.filter({ id: activeCompany.id });
      setCompany(companies[0]);
    } catch (e) {
      console.error('Error loading company:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!company) return <div className="p-6">Company not found</div>;

  const isOwner = user?.email === company.created_by || user?.role === 'admin' || user?.role === 'super_admin' || companyRole === 'owner';
  const isParentCompany = !company.parent_company_id;
  const MANAGER_ROLES = ['owner', 'manager', 'dispatcher', 'field_service_manager', 'admin', 'super_admin'];
  const isManager = (user?.role && MANAGER_ROLES.includes(user?.role)) || MANAGER_ROLES.includes(companyRole);
  const isFieldServiceManager = companyRole === 'field_service_manager';

  // Non-managers — only see their own account profile
  if (!isManager) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Account</h1>
            <p className="text-slate-500 mt-1">{company.name}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-slate-500" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-blue-600 text-white text-xl">
                    {user?.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{user?.full_name || "User"}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {user?.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="bg-slate-50 rounded-lg p-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Role
                  </span>
                  <Badge className="mt-1 bg-blue-100 text-blue-700 text-sm capitalize">
                    {user?.role || "User"}
                  </Badge>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Company
                  </span>
                  <p className="text-sm font-medium text-slate-800 mt-1">{company.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <PwaInstallButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-slate-500 mt-1">Company Settings</p>
        </div>

        <PwaInstallButton />

        <Tabs defaultValue="team" className="w-full">
          <TabsList>
            <TabsTrigger value="team">Team</TabsTrigger>
            {!isFieldServiceManager && <TabsTrigger value="billing">Billing & Plan</TabsTrigger>}
            <TabsTrigger value="portal">Customer Portal</TabsTrigger>
            {!isFieldServiceManager && <TabsTrigger value="payments">Payments</TabsTrigger>}
            <TabsTrigger value="email">Email Settings</TabsTrigger>
            {isOwner && isParentCompany && <TabsTrigger value="locations">Locations</TabsTrigger>}
            {!isFieldServiceManager && <TabsTrigger value="margins">Margin Rules</TabsTrigger>}
            <TabsTrigger value="connectors">Connectors</TabsTrigger>
            {!isFieldServiceManager && <TabsTrigger value="api">API & Webhooks</TabsTrigger>}
            <TabsTrigger value="seo">SEO & Analytics</TabsTrigger>
            {isOwner && <TabsTrigger value="general">General</TabsTrigger>}
          </TabsList>

          <TabsContent value="team">
            <CompanyTeamTab company={company} />
          </TabsContent>

          {!isFieldServiceManager && (
          <TabsContent value="billing">
            <CompanyBillingTab company={company} />
          </TabsContent>
          )}

          <TabsContent value="portal">
            <CustomerPortalSettingsTab company={company} onSave={loadCompany} />
          </TabsContent>

          {!isFieldServiceManager && (
          <TabsContent value="payments">
            <StripeConnectCard company={company} />
          </TabsContent>
          )}

          <TabsContent value="email">
            <CompanyEmailSettingsTab company={company} />
          </TabsContent>

          {!isFieldServiceManager && (
          <TabsContent value="margins">
            <MarginRulesTab company={company} />
          </TabsContent>
          )}

          <TabsContent value="connectors">
            <ConnectorsTab company={company} />
          </TabsContent>

          {!isFieldServiceManager && (
          <TabsContent value="api">
            <ApiWebhooksTab company={company} />
          </TabsContent>
          )}

          <TabsContent value="seo">
            <SeoAnalyticsTab company={company} onSave={loadCompany} />
          </TabsContent>

          {isOwner && isParentCompany && (
            <TabsContent value="locations">
              <SubCompaniesTab
                company={company}
                subscription={subscription}
                onSubCompanyCreated={refreshCompanies}
              />
            </TabsContent>
          )}

          {isOwner && (
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Manage company profile</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">Coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}