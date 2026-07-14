import { Link } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, FileText, DollarSign,
  UserPlus, Settings, CalendarDays, Bell, MessageCircle,
  Calculator, Wrench, BookOpen, CreditCard, Globe,
  CheckCircle, Zap, Star, ArrowRight, Shield, BarChart3,
  Smartphone, Clock, TrendingUp, ChevronRight
} from "lucide-react";

const features = [
  {
    icon: UserPlus,
    title: "Lead Management",
    desc: "Capture leads from your website via an embeddable form. Track them through your pipeline from first contact to converted customer.",
    color: "bg-green-500"
  },
  {
    icon: Users,
    title: "Customer CRM",
    desc: "A full customer database with contact info, service addresses, communication history, and revenue tracking — all in one place.",
    color: "bg-purple-500"
  },
  {
    icon: FileText,
    title: "Professional Estimates",
    desc: "Build multi-option estimates with your price book. Send for digital approval and convert to jobs instantly when accepted.",
    color: "bg-yellow-500"
  },
  {
    icon: Briefcase,
    title: "Job Management",
    desc: "Track every job from creation to completion. Assign techs, log before/after photos, attach receipts, and manage checklists.",
    color: "bg-orange-500"
  },
  {
    icon: CalendarDays,
    title: "Visual Scheduling",
    desc: "Drag-and-drop calendar for dispatching. View all jobs by technician, date, or status. Color-coded by team member.",
    color: "bg-cyan-500"
  },
  {
    icon: DollarSign,
    title: "Invoicing & Payments",
    desc: "Create and send invoices in seconds. Accept online payments via Stripe or record cash/check. Track overdue invoices automatically.",
    color: "bg-emerald-500"
  },
  {
    icon: MessageCircle,
    title: "Two-Way Messaging",
    desc: "Communicate with customers directly from the platform. Replies land in your inbox — no separate email client needed.",
    color: "bg-violet-500"
  },
  {
    icon: Globe,
    title: "Customer Portal",
    desc: "Give every customer a self-service portal to view jobs, approve estimates, pay invoices, and update their account.",
    color: "bg-fuchsia-500"
  },
  {
    icon: Calculator,
    title: "Built-in Accounting",
    desc: "Full double-entry accounting with chart of accounts, transaction ledger, bank reconciliation, and P&L reports.",
    color: "bg-teal-500"
  },
  {
    icon: BookOpen,
    title: "Price Book",
    desc: "Maintain a catalog of your standard services and materials. Add items to estimates and invoices with one click.",
    color: "bg-rose-500"
  },
  {
    icon: Bell,
    title: "Automated Notifications",
    desc: "Auto-send appointment reminders, invoice reminders, and review requests. Keep customers informed without manual effort.",
    color: "bg-amber-500"
  },
  {
    icon: BarChart3,
    title: "Reports & Insights",
    desc: "Revenue charts, job reports, and AI-powered insights help you understand trends and make better business decisions.",
    color: "bg-indigo-500"
  }
];

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    desc: "Perfect for solo operators and small teams just getting started.",
    features: [
      "Up to 5 team members",
      "Unlimited customers & jobs",
      "Estimates & invoices",
      "Customer portal",
      "Email notifications",
      "Basic reports"
    ],
    cta: "Get Started",
    highlight: false
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    desc: "For growing teams that need more power and automation.",
    features: [
      "Up to 25 team members",
      "Everything in Starter",
      "Advanced accounting module",
      "AI Estimator & AI Insights",
      "Custom email domain",
      "Priority support"
    ],
    cta: "Start Free Trial",
    highlight: true
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    desc: "For large operations with multiple locations and teams.",
    features: [
      "Unlimited team members",
      "Everything in Professional",
      "Multi-location / sub-companies",
      "Dedicated onboarding",
      "Custom integrations",
      "SLA support"
    ],
    cta: "Contact Sales",
    highlight: false
  }
];

const testimonials = [
  {
    name: "Marcus T.",
    role: "Owner, Bright Clean Co.",
    text: "FieldFlow Pro replaced 4 different tools we were using. Our team is way more organized and customers love the portal.",
    stars: 5
  },
  {
    name: "Sandra R.",
    role: "Operations Manager, GreenScape Landscaping",
    text: "The scheduling and dispatching features alone saved us hours every week. The mobile experience is excellent for our field techs.",
    stars: 5
  },
  {
    name: "Jake M.",
    role: "Owner, ProPaint Services",
    text: "Getting paid faster was the biggest win. Customers now pay online the same day we send the invoice.",
    stars: 5
  }
];

export default function ProductOverview() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <img
            src="https://media.base44.com/images/public/69b20e4261ce8a3e5bf093b0/408bce6f6_LGipynfh-removebg-preview.png"
            alt="FieldFlow Pro"
            style={{ height: "3.5rem" }}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-4">
          <Link to="/Documentation" className="text-sm text-slate-600 hover:text-slate-900">Docs</Link>
          <Link to="/Landing" className="text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" /> The all-in-one platform for field service businesses
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Run your entire<br />
            <span className="text-blue-400">field service business</span><br />
            from one platform.
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Leads, estimates, jobs, scheduling, invoicing, payments, accounting, and a customer portal — all connected, all in FieldFlow Pro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/Register"
              className="px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/Documentation"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-lg transition-colors border border-white/20"
            >
              View Full Docs
            </Link>
          </div>
          <p className="text-slate-400 text-sm mt-6">14-day free trial</p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-600 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "10,000+", label: "Jobs Tracked" },
            { value: "98%", label: "Customer Satisfaction" },
            { value: "2x", label: "Faster Payments" },
            { value: "5 hrs", label: "Saved per Week" }
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-blue-200 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need, nothing you don't</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Built specifically for cleaning, landscaping, painting, plumbing, electrical, HVAC, and other field service businesses.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">The complete workflow, end-to-end</h2>
            <p className="text-lg text-slate-500">Every step of your business process flows seamlessly into the next.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {[
              { step: "1", label: "Capture Lead", icon: UserPlus, color: "text-green-600 bg-green-100" },
              { step: "→", label: "", icon: null, color: "" },
              { step: "2", label: "Send Estimate", icon: FileText, color: "text-yellow-600 bg-yellow-100" },
              { step: "→", label: "", icon: null, color: "" },
              { step: "3", label: "Schedule Job", icon: CalendarDays, color: "text-cyan-600 bg-cyan-100" },
            ].map((item, i) => (
              item.icon ? (
                <div key={i} className="flex flex-col items-center text-center p-4 rounded-xl border border-slate-100">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 mb-1">Step {item.step}</span>
                  <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                </div>
              ) : (
                <div key={i} className="hidden md:flex justify-center">
                  <ChevronRight className="w-6 h-6 text-slate-300" />
                </div>
              )
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center mt-4">
            {[
              { step: "4", label: "Complete Work", icon: Briefcase, color: "text-orange-600 bg-orange-100" },
              { step: "→", label: "", icon: null, color: "" },
              { step: "5", label: "Send Invoice", icon: DollarSign, color: "text-emerald-600 bg-emerald-100" },
              { step: "→", label: "", icon: null, color: "" },
              { step: "6", label: "Get Paid", icon: CreditCard, color: "text-pink-600 bg-pink-100" },
            ].map((item, i) => (
              item.icon ? (
                <div key={i} className="flex flex-col items-center text-center p-4 rounded-xl border border-slate-100">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 mb-1">Step {item.step}</span>
                  <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                </div>
              ) : (
                <div key={i} className="hidden md:flex justify-center">
                  <ChevronRight className="w-6 h-6 text-slate-300" />
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section className="bg-slate-900 text-white px-6 py-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-sm px-3 py-1.5 rounded-full mb-4">
              <Smartphone className="w-3.5 h-3.5" /> Mobile-First Design
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for the field, not just the office</h2>
            <p className="text-slate-300 text-lg mb-6">
              Your field techs can update job status, upload photos, capture signatures, and view their schedule — all from their phone. No laptop required.
            </p>
            <ul className="space-y-3">
              {[
                "Update job status on-site",
                "Upload before/after photos",
                "View daily schedule",
                "Access customer info offline",
                "Log receipts with OCR scanning"
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center max-w-xs w-full">
              <Smartphone className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <p className="text-slate-300 text-sm">Responsive on all devices — phones, tablets, and desktops.</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-green-400 text-xs font-medium">Works on iOS & Android</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Trusted by field service businesses</h2>
            <p className="text-slate-500">Real results from real customers.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex gap-1 mb-3">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-lg text-slate-500">All plans include a 14-day free trial.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border ${plan.highlight
                  ? "bg-blue-600 text-white border-blue-600 shadow-xl scale-105"
                  : "bg-white border-slate-200"
                }`}
              >
                {plan.highlight && (
                  <div className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full inline-block mb-4">Most Popular</div>
                )}
                <h3 className={`text-xl font-bold mb-1 ${plan.highlight ? "text-white" : "text-slate-900"}`}>{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.highlight ? "text-blue-100" : "text-slate-500"}`}>{plan.desc}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-slate-900"}`}>{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.highlight ? "text-blue-200" : "text-slate-500"}`}>{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-blue-100" : "text-slate-600"}`}>
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-white" : "text-green-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/Register"
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${plan.highlight
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "bg-slate-900 text-white hover:bg-slate-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-blue-200" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to grow your business?</h2>
          <p className="text-blue-100 text-lg mb-8">Join hundreds of field service businesses already using FieldFlow Pro. Start your free trial today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/Register"
              className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl text-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/Documentation"
              className="px-8 py-4 bg-blue-500 text-white font-semibold rounded-xl text-lg hover:bg-blue-400 transition-colors border border-blue-400"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm">© 2025 FieldFlow Pro. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/TermsOfService" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/PrivacyPolicy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/Documentation" className="hover:text-white transition-colors">Docs</Link>
            <Link to="/Landing" className="hover:text-white transition-colors">Log In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}