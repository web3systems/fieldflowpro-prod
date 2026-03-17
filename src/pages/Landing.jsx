import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Globe, CheckCircle, ArrowRight, Menu, X, Star,
  Briefcase, Users, DollarSign, Calendar, BarChart3,
  MessageSquare, Zap, Shield, Smartphone, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PLANS = [
  {
    name: "Starter",
    price: 49,
    color: "border-blue-200",
    badge: null,
    description: "Perfect for solo operators and small crews just getting started.",
    features: [
      "Core CRM",
      "Jobs & Scheduling",
      "Invoicing",
      "Customer Portal",
      "Lead Capture",
      "Estimates",
      "1 Subsidiary",
      "Up to 3 users",
    ],
  },
  {
    name: "Professional",
    price: 99,
    color: "border-violet-400",
    badge: "Most Popular",
    description: "For growing field service businesses that need more power.",
    features: [
      "Everything in Starter",
      "Up to 5 Subsidiaries",
      "Accounting Module",
      "Marketing Campaigns",
      "Reports & Analytics",
      "Stripe Payments",
      "Recurring Jobs",
      "Up to 10 users",
    ],
  },
  {
    name: "Enterprise",
    price: 199,
    color: "border-amber-300",
    badge: null,
    description: "For large operations that need unlimited scale and priority support.",
    features: [
      "Everything in Professional",
      "Unlimited Subsidiaries",
      "Unlimited Users",
      "Priority Support",
      "Custom Onboarding",
      "SLA Guarantee",
    ],
  },
];

const FEATURES = [
  {
    icon: Briefcase,
    title: "Jobs & Scheduling",
    desc: "Dispatch jobs, assign technicians, and track progress from a single dashboard.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Users,
    title: "CRM & Customers",
    desc: "Manage leads, customers, and service addresses with a full activity history.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: DollarSign,
    title: "Invoicing & Payments",
    desc: "Create estimates, send invoices, and collect payments online via Stripe.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Calendar,
    title: "Calendar & Dispatch",
    desc: "Drag-and-drop scheduling with real-time technician availability.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Revenue trends, job completion rates, and custom dashboards.",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: MessageSquare,
    title: "Marketing Campaigns",
    desc: "Send targeted email and SMS campaigns to re-engage your customer base.",
    color: "bg-cyan-50 text-cyan-600",
  },
];

const TESTIMONIALS = [
  {
    name: "Mike Torres",
    company: "Torres Landscaping",
    quote: "FieldFlow Pro replaced 4 different tools we were using. Our team is faster, billing is automated, and we haven't missed an invoice since.",
    rating: 5,
  },
  {
    name: "Sarah Chen",
    company: "Bright Clean Co.",
    quote: "The customer portal alone paid for itself. Clients book online, get reminders automatically, and we spend less time on the phone.",
    rating: 5,
  },
  {
    name: "James Whitfield",
    company: "Whitfield Electrical",
    quote: "We manage 3 service brands from one dashboard. The multi-company feature is a game changer for us.",
    rating: 5,
  },
];

const FAQS = [
  {
    q: "Can I try FieldFlow Pro before paying?",
    a: "Yes! Every new account starts with a free trial so you can explore the full platform before committing to a plan.",
  },
  {
    q: "Can I manage multiple companies or brands?",
    a: "Absolutely. Professional plans support up to 5 subsidiaries, and Enterprise gives you unlimited companies under one account.",
  },
  {
    q: "How does online payment collection work?",
    a: "We integrate with Stripe so your customers can pay invoices online. Funds go directly to your Stripe account.",
  },
  {
    q: "Is there a mobile app?",
    a: "FieldFlow Pro is fully responsive and works great on mobile browsers. A dedicated native app is on our roadmap.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.",
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 py-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left gap-4"
      >
        <span className="font-medium text-slate-800">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="mt-3 text-slate-500 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">FieldFlow <span className="text-blue-600">Pro</span></span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-slate-900 transition-colors">Reviews</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/Dashboard">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/Register">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Get Started Free</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm text-slate-600" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" className="block text-sm text-slate-600" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#testimonials" className="block text-sm text-slate-600" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
            <a href="#faq" className="block text-sm text-slate-600" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <div className="flex gap-2 pt-2">
              <Link to="/Dashboard" className="flex-1"><Button variant="outline" className="w-full" size="sm">Sign In</Button></Link>
              <Link to="/Register" className="flex-1"><Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm">Get Started</Button></Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-36 text-center">
          <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 mb-6 text-xs px-3 py-1">
            🚀 Built for Field Service Businesses
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
            Run your field service<br className="hidden sm:block" />
            <span className="text-blue-400"> business smarter.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            FieldFlow Pro gives cleaning, landscaping, plumbing, and electrical businesses the tools to schedule jobs, manage customers, send invoices, and grow — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/Register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 w-full sm:w-auto">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto">
                See How It Works
              </Button>
            </a>
          </div>
          <p className="text-slate-500 text-sm mt-6">No credit card required · Cancel anytime</p>
        </div>

      </section>

      {/* LOGOS / SOCIAL PROOF */}
      <section className="bg-slate-50 pt-24 pb-12 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-slate-400 text-sm mb-8 uppercase tracking-widest font-medium">Trusted by field service businesses across industries</p>
          <div className="flex flex-wrap justify-center gap-6 text-slate-400 font-semibold text-sm">
            {["Cleaning", "Landscaping", "Plumbing", "Electrical", "HVAC", "Handyman", "Painting"].map(i => (
              <span key={i} className="px-4 py-2 bg-white border border-slate-200 rounded-full">{i}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <Badge className="bg-blue-50 text-blue-600 border-blue-100 mb-4">Features</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything your crew needs</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">From booking to payment, FieldFlow Pro handles the entire job lifecycle so you can focus on the work.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Extra highlights */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: Zap, label: "Lightning fast setup", sub: "Get running in under 10 minutes" },
            { icon: Shield, label: "Secure & reliable", sub: "Enterprise-grade data security" },
            { icon: Smartphone, label: "Mobile friendly", sub: "Works great on any device" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-6 bg-slate-50 rounded-2xl">
              <Icon className="w-6 h-6 text-blue-600" />
              <p className="font-semibold text-slate-800 text-sm">{label}</p>
              <p className="text-slate-400 text-xs">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge className="bg-violet-50 text-violet-600 border-violet-100 mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-500 text-lg">Start free. Upgrade as you grow. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl border-2 ${plan.color} p-8 flex flex-col ${plan.badge ? "shadow-xl scale-105" : "shadow-sm"}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600 text-white border-0 px-3 py-0.5">{plan.badge}</Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mt-1">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">${plan.price}</span>
                  <span className="text-slate-400 text-sm">/mo</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/Register">
                  <Button
                    className={`w-full ${plan.badge ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-700"}`}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-8">All plans start with a free trial. No credit card required to sign up.</p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 mb-4">Reviews</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Loved by field service pros</h2>
          <p className="text-slate-500 text-lg">See what real business owners are saying.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ name, company, quote, rating }) => (
            <div key={name} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">"{quote}"</p>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{name}</p>
                <p className="text-slate-400 text-xs">{company}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge className="bg-orange-50 text-orange-600 border-orange-100 mb-4">FAQ</Badge>
            <h2 className="text-3xl font-bold text-slate-900">Frequently asked questions</h2>
          </div>
          <div>
            {FAQS.map(faq => <FAQItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-violet-700 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to grow your business?</h2>
          <p className="text-blue-100 text-lg mb-10">Join field service businesses already using FieldFlow Pro to save time, collect faster, and delight customers.</p>
          <Link to="/Register">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 gap-2 px-10 font-semibold">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-blue-200 text-sm mt-4">No credit card required · Set up in minutes</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-bold text-sm">FieldFlow Pro</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <Link to="/Register" className="hover:text-white transition-colors">Sign Up</Link>
            </div>
            <p className="text-xs text-slate-600">© 2026 FieldFlow Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}