// Subscription plan config — single source of truth
// NOTE: priceId fields for starter/growth/pro point to Stripe Price objects.
// starter/growth/pro map to PLAN_KEYS used by createSubscriptionCheckout.

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
    price: 99,
    priceId: null, // set via createSubscriptionCheckout PRICE_IDS
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    features: ['1 company included', 'Unlimited jobs', 'Unlimited team members', 'Core CRM', 'Jobs & Scheduling', 'Invoicing', 'Customer Portal', 'Lead Capture', 'Estimates'],
  },
  growth: {
    name: 'Growth',
    price: 149,
    priceId: null, // set via createSubscriptionCheckout PRICE_IDS
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    features: ['3 companies included', '+$29/mo per additional company', 'Everything in Starter', 'Multi-company dashboard', 'Custom email branding', 'Priority support', 'All AI agents included'],
    popular: true,
  },
  pro: {
    name: 'Pro',
    price: 299,
    priceId: null, // set via createSubscriptionCheckout PRICE_IDS
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    features: ['10 companies included', '+$19/mo per additional company', 'Everything in Growth', 'White label ready', 'API access', 'Advanced reporting', 'Dedicated support'],
  },
  lifetime: {
    name: 'Lifetime — All Access',
    price: 2500,
    oneTime: true,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    features: ['All features included forever', 'All modules included', 'No monthly fees, ever', 'Everything in Pro', 'Unlimited companies', 'All AI agents included', 'All future updates included', 'White label ready'],
  },
};

export const LIFETIME_PRICE = 2500;

export function canAccessFeature(subscription, feature) {
  if (!subscription) return false;
  const plan = subscription.plan || 'trial';
  const status = subscription.status;
  if (!['trialing', 'active'].includes(status)) return false;

  // Lifetime plan unlocks everything
  if (plan === 'lifetime') return true;

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