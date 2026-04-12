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

export default function CompanySettings() {
  const { activeCompany, user, refreshCompanies } = useApp();
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

  const isOwner = user?.email === company.created_by || user?.role === 'admin' || user?.role === 'super_admin';
  const isParentCompany = !company.parent_company_id;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-slate-500 mt-1">Company Settings</p>
        </div>

        <Tabs defaultValue="team" className="w-full">
          <TabsList>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="billing">Billing & Plan</TabsTrigger>
            <TabsTrigger value="portal">Customer Portal</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="email">Email Settings</TabsTrigger>
            {isOwner && isParentCompany && <TabsTrigger value="locations">Locations</TabsTrigger>}
            {isOwner && <TabsTrigger value="general">General</TabsTrigger>}
          </TabsList>

          <TabsContent value="team">
            <CompanyTeamTab company={company} />
          </TabsContent>

          <TabsContent value="billing">
            <CompanyBillingTab company={company} />
          </TabsContent>

          <TabsContent value="portal">
            <CustomerPortalSettingsTab company={company} onSave={loadCompany} />
          </TabsContent>

          <TabsContent value="payments">
            <StripeConnectCard company={company} />
          </TabsContent>

          <TabsContent value="email">
            <CompanyEmailSettingsTab company={company} />
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