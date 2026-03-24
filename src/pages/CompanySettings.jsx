import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/layout.jsx';
import CompanyTeamTab from '@/components/settings/CompanyTeamTab';
import CompanyBillingTab from '@/components/settings/CompanyBillingTab';
import CustomerPortalSettingsTab from '@/components/settings/CustomerPortalSettingsTab';

export default function CompanySettings() {
  const { activeCompany, user } = useApp();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany) loadCompany();
  }, [activeCompany?.id]);

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

  const isOwner = user?.email === company.created_by || user?.role === 'admin';

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
            {isOwner && <TabsTrigger value="general">General</TabsTrigger>}
          </TabsList>

          <TabsContent value="team">
            <CompanyTeamTab company={company} />
          </TabsContent>

          <TabsContent value="billing">
            <CompanyBillingTab company={company} />
          </TabsContent>

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