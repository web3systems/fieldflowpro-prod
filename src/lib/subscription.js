// Subscription plan config — single source of truth
// NOTE: priceId fields for starter/growth/pro need real Stripe Price objects created
// at $69/$149/$299 before live billing is enabled. Do not invent IDs here.

export const PLANS = {
  trial: {
    name: 'Free Trial',
    price: 0,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    features: ['Core CRM', 'Jobs & Scheduling', 'Invoicing', 'Customer Portal'],
  },
  starter: {
    name: 'Starter',
    price: 69,
    priceId: null, // TODO: create Stripe price at $69/mo
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    features: ['1 company included', 'Unlimited jobs', 'Unlimited team members', 'Core CRM', 'Jobs & Scheduling', 'Invoicing', 'Customer Portal', 'Lead Capture', 'Estimates'],
  },
  growth: {
    name: 'Growth',
    price: 149,
    priceId: null, // TODO: create Stripe price at $149/mo
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    features: ['3 companies included', '+$29/mo per additional company', 'Everything in Starter', 'Multi-company dashboard', 'Custom email branding', 'Priority support', 'All AI agents included'],
    popular: true,
  },
  pro: {
    name: 'Pro',
    price: 299,
    priceId: null, // TODO: create Stripe price at $299/mo
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    features: ['10 companies included', '+$19/mo per additional company', 'Everything in Growth', 'White label ready', 'API access', 'Advanced reporting', 'Dedicated support'],
  },
};

export function canAccessFeature(subscription, feature) {
  if (!subscription) return false;
  const plan = subscription.plan || 'trial';
  const status = subscription.status;
  if (!['trialing', 'active'].includes(status)) return false;

  const featureMap = {
    accounting: ['growth', 'pro'],
    marketing: ['growth', 'pro'],
    reports: ['growth', 'pro'],
    stripe_payments: ['growth', 'pro'],
    recurring_jobs: ['growth', 'pro'],
  };

  const allowed = featureMap[feature];
  if (!allowed) return true; // no restriction = available to all
  return allowed.includes(plan);
}

export function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  return ['trialing', 'active'].includes(subscription.status);
}