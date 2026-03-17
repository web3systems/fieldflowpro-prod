import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, CreditCard } from 'lucide-react';

const PLANS = {
  starter: { name: 'Starter', price: 49, features: ['Up to 100 customers', 'Basic reporting', 'Email support'] },
  professional: { name: 'Professional', price: 99, features: ['Up to 500 customers', 'Advanced reporting', 'Priority support', 'API access'] },
  enterprise: { name: 'Enterprise', price: 199, features: ['Unlimited customers', 'Custom reports', '24/7 support', 'Dedicated account manager'] }
};

export default function CompanyBillingTab({ company }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBilling();
  }, [company.id]);

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

  async function handleUpgradePlan(newPlan) {
    try {
      const response = await base44.functions.invoke('createSubscriptionCheckout', {
        company_id: company.id,
        plan: newPlan,
        company_name: company.name
      });

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (e) {
      console.error('Error upgrading plan:', e);
      alert('Error initiating checkout');
    }
  }

  if (loading) return <div className="p-4">Loading billing...</div>;

  const currentPlan = subscription?.plan || 'trial';
  const currentStatus = subscription?.status || 'trialing';

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Active subscription details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">{PLANS[currentPlan]?.name || 'Trial'}</p>
              <p className="text-sm text-slate-500 mt-1">
                ${PLANS[currentPlan]?.price || 0}/month
              </p>
            </div>
            <div className="text-right">
              <Badge className={currentStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              </Badge>
              {subscription?.trial_ends_at && (
                <p className="text-xs text-slate-500 mt-2">
                  Trial ends: {new Date(subscription.trial_ends_at).toLocaleDateString()}
                </p>
              )}
              {subscription?.current_period_end && (
                <p className="text-xs text-slate-500 mt-2">
                  Renews: {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Upgrade or Downgrade</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(PLANS).map(([planKey, plan]) => (
            <Card key={planKey} className={currentPlan === planKey ? 'border-blue-500 border-2' : ''}>
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-slate-500">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {currentPlan === planKey ? (
                  <Badge className="w-full justify-center">Current Plan</Badge>
                ) : (
                  <Button
                    onClick={() => handleUpgradePlan(planKey)}
                    className="w-full"
                    variant={currentPlan === planKey ? 'outline' : 'default'}
                  >
                    {currentPlan === 'trial' ? 'Choose Plan' : planKey > currentPlan ? 'Upgrade' : 'Downgrade'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscription?.stripe_customer_id ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Your payment method is securely stored with Stripe.</p>
              <Button variant="outline">Update Payment Method</Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No payment method on file yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}