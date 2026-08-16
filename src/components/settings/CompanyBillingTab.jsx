import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, CreditCard, ExternalLink, AlertTriangle } from 'lucide-react';
import { PLANS } from '@/lib/subscription';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800',
  trialing: 'bg-blue-100 text-blue-800',
  past_due: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-600',
  paused: 'bg-amber-100 text-amber-800',
};

export default function CompanyBillingTab({ company }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    loadBilling();
  }, [company?.id]);

  async function loadBilling() {
    try {
      const subs = await base44.entities.Subscription.filter({ company_id: company.id });
      setSubscription(subs[0] || null);
    } catch (e) {
      console.error('Error loading subscription:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleChoosePlan(planKey) {
    setCheckoutLoading(planKey);
    try {
      const response = await base44.functions.invoke('createSubscriptionCheckout', {
        company_id: company.id,
        company_name: company.name,
        plan: planKey,
        owner_email: subscription?.owner_email || '',
        owner_name: subscription?.owner_name || '',
        success_url: `${window.location.origin}/CompanySettings?tab=billing&subscribed=true`,
        cancel_url: `${window.location.origin}/CompanySettings?tab=billing`,
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      console.error('Error creating checkout:', e);
      alert('Error initiating checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke('manageSubscription', {
        action: 'create_portal',
        company_id: company.id,
        return_url: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      console.error('Error opening portal:', e);
      alert('Error opening billing portal.');
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) return <div className="p-4 text-slate-500">Loading billing info...</div>;

  const currentPlan = subscription?.plan || 'trial';
  const currentStatus = subscription?.status || 'trialing';
  const trialEnds = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const trialExpired = currentStatus === 'trialing' && trialEnds && trialEnds < new Date();
  const isActive = ['active', 'trialing'].includes(currentStatus) && !trialExpired;

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xl font-bold text-slate-800">
                {PLANS[currentPlan]?.name || 'Free Trial'}
              </p>
              <p className="text-slate-500 text-sm mt-0.5">
                {currentPlan !== 'trial' ? `$${PLANS[currentPlan]?.price}/month` : 'Free'}
              </p>
              {trialEnds && currentStatus === 'trialing' && (
                <p className={`text-sm mt-1 font-medium ${trialExpired ? 'text-red-600' : 'text-blue-600'}`}>
                  {trialExpired
                    ? `Trial ended ${trialEnds.toLocaleDateString()}`
                    : `Trial ends ${trialEnds.toLocaleDateString()}`}
                </p>
              )}
              {subscription?.current_period_end && currentStatus === 'active' && (
                <p className="text-sm text-slate-500 mt-1">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge className={STATUS_STYLES[currentStatus] || 'bg-slate-100 text-slate-600'}>
                {trialExpired ? 'Trial Expired' : currentStatus.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
              </Badge>
              {subscription?.stripe_customer_id && (
                <Button variant="outline" size="sm" onClick={openBillingPortal} disabled={portalLoading} className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {portalLoading ? 'Opening...' : 'Manage Billing'}
                </Button>
              )}
            </div>
          </div>

          {currentStatus === 'past_due' && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">Your payment failed. Please update your billing info to keep access.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Options — show if not on active paid plan */}
      {(trialExpired || currentPlan === 'trial' || currentStatus === 'cancelled') && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-slate-800">
            {trialExpired ? 'Subscribe to Continue' : 'Choose a Plan'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['starter', 'growth', 'pro'].map(planKey => {
              const plan = PLANS[planKey];
              const isCurrent = currentPlan === planKey && isActive;
              return (
                <Card key={planKey} className={`relative ${planKey === 'growth' ? 'border-blue-400 border-2' : ''} ${isCurrent ? 'border-green-400 border-2' : ''}`}>
                  {planKey === 'growth' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <div>
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-slate-500 text-sm">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <Badge className="w-full justify-center bg-green-100 text-green-700">Current Plan</Badge>
                    ) : (
                      <Button
                        onClick={() => handleChoosePlan(planKey)}
                        disabled={!!checkoutLoading}
                        className={`w-full ${planKey === 'growth' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        variant={planKey === 'growth' ? 'default' : 'outline'}
                      >
                        {checkoutLoading === planKey ? 'Loading...' : 'Subscribe'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}