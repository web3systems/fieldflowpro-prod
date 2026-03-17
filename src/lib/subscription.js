// Subscription plan config — single source of truth

export const PLANS = {
  trial: {
    name: 'Free Trial',
    price: 0,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    limits: { users: 2, jobs_per_month: 50, subsidiaries: 1 },
    features: ['Core CRM', 'Jobs & Scheduling', 'Invoicing', 'Customer Portal'],
  },
  starter: {
    name: 'Starter',
    price: 49,
    priceId: 'price_1TC3qE1h2Mdv0bDiUHlkJa2h',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    limits: { users: 3, jobs_per_month: 100, subsidiaries: 1 },
    features: ['Core CRM', 'Jobs & Scheduling', 'Invoicing', 'Customer Portal', 'Lead Capture', 'Estimates', '1 Subsidiary'],
  },
  professional: {
    name: 'Professional',
    price: 99,
    priceId: 'price_1TC3qE1h2Mdv0bDi8fyZ8r78',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    limits: { users: 10, jobs_per_month: null, subsidiaries: 5 },
    features: ['Everything in Starter', 'Up to 5 Subsidiaries', 'Accounting Module', 'Marketing Campaigns', 'Reports & Analytics', 'Stripe Payments', 'Recurring Jobs'],
    popular: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    priceId: 'price_1TBz4DPEbOjnaqMM6KLChSbK',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    limits: { users: null, jobs_per_month: null, subsidiaries: null },
    features: ['Everything in Professional', 'Unlimited Subsidiaries', 'Unlimited Users', 'Priority Support', 'Custom Onboarding', 'SLA Guarantee'],
  },
};

export function canAccessFeature(subscription, feature) {
  if (!subscription) return false;
  const plan = subscription.plan || 'trial';
  const status = subscription.status;
  if (!['trialing', 'active'].includes(status)) return false;

  const featureMap = {
    accounting: ['professional', 'enterprise'],
    marketing: ['professional', 'enterprise'],
    reports: ['professional', 'enterprise'],
    stripe_payments: ['professional', 'enterprise'],
    recurring_jobs: ['professional', 'enterprise'],
    unlimited_users: ['enterprise'],
  };

  const allowed = featureMap[feature];
  if (!allowed) return true; // no restriction = available to all
  return allowed.includes(plan);
}

export function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  return ['trialing', 'active'].includes(subscription.status);
}