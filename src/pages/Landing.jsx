import { Link } from "react-router-dom";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Menu, X, ArrowRight, Hammer, Sparkles, Building2, Star,
  ShieldCheck, Zap, MapPin, DollarSign, FileText, CheckCircle,
  LayoutGrid, ClipboardCheck, ReceiptText, Tag, Users, GitBranch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lifetimeEmail, setLifetimeEmail] = useState("");
  const [lifetimeCompany, setLifetimeCompany] = useState("");
  const [lifetimeLoading, setLifetimeLoading] = useState(false);

  const handleSignIn = () => {
    base44.auth.redirectToLogin(`${window.location.origin}/Dashboard`);
  };

  async function handleBuyLifetime() {
    // Block checkout inside the iframe preview — only works from a published app
    if (window.self !== window.top) {
      alert("Checkout is only available from the published app. Please open the app directly to purchase.");
      return;
    }
    if (!lifetimeEmail || !/.+@.+\..+/.test(lifetimeEmail)) {
      alert("Please enter a valid email address.");
      return;
    }
    setLifetimeLoading(true);
    try {
      const response = await base44.functions.invoke('createLifetimeCheckout', {
        owner_email: lifetimeEmail,
        owner_name: '',
        company_name: lifetimeCompany || undefined,
        success_url: `${window.location.origin}/Dashboard?lifetime=true`,
        cancel_url: `${window.location.origin}/Landing`,
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else if (response.data?.error) {
        alert(response.data.error);
      }
    } catch (e) {
      console.error('Lifetime checkout error:', e);
      alert('Something went wrong starting checkout. Please try again.');
    } finally {
      setLifetimeLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center">
            <img
              src="https://media.base44.com/images/public/69b20e4261ce8a3e5bf093b0/408bce6f6_LGipynfh-removebg-preview.png"
              alt="FieldFlow Pro"
              className="h-24 w-auto"
            />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <Link to="/Articles" className="hover:text-slate-900 transition-colors">Articles</Link>
            <a href="#compare" className="hover:text-slate-900 transition-colors">Compare</a>
            <a href="#why-us" className="hover:text-slate-900 transition-colors">Why Us</a>
            <a href="#ai" className="hover:text-slate-900 transition-colors">AI Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleSignIn}>Sign In</Button>
            <Link to="/Register">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Start Free Trial</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1">
            <Link to="/Articles" className="block px-2 py-3 text-base text-slate-700 border-b border-slate-50 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>Articles</Link>
            {[
              { href: "#compare", label: "Compare" },
              { href: "#why-us", label: "Why Us" },
              { href: "#ai", label: "AI Features" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
            ].map(({ href, label }) => (
              <a key={label} href={href} className="block px-2 py-3 text-base text-slate-700 border-b border-slate-50 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>{label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-3">
              <Button variant="outline" className="w-full" size="default" onClick={() => { setMobileMenuOpen(false); handleSignIn(); }}>Sign In</Button>
              <Link to="/Register"><Button className="w-full bg-blue-600 hover:bg-blue-700" size="default">Start Free Trial</Button></Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left Content */}
            <div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 mb-6 text-xs font-medium px-4 py-1.5 rounded-full">
                Built for handymen, cleaners, and multi-company operators
              </Badge>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
                Finally. Field service software
                <br />
                <span className="text-blue-600">that works the way you actually work.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-8 max-w-xl">
                One login. Every company. Flat-rate pricing. And an AI fraud detection agent already built in — because you can't watch every job yourself.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link to="/Register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 w-full sm:w-auto text-base py-6 sm:py-4">
                    Start Free 14-Day Trial <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <a href="#why-us">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-300 text-slate-700 gap-2 px-8 text-base py-6 sm:py-4">
                    See How It Works
                  </Button>
                </a>
              </div>

              <p className="text-slate-400 text-sm">
                Your whole team running in under an hour
              </p>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1200&auto=format&fit=crop&q=80"
                  alt="Technician reviewing a job with a homeowner"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
              {/* Decorative glow */}
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-400/20 via-transparent to-transparent rounded-[2rem] -z-10 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-slate-900 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { stat: "20+", label: "Jobs managed per week" },
              { stat: "5", label: "Companies on one login" },
              { stat: "Hours", label: "Saved on invoicing every week" },
              { stat: "1", label: "Fraud case caught by AI before it became a problem" },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-1.5">{stat}</div>
                <div className="text-slate-400 text-xs sm:text-sm leading-snug max-w-[180px] mx-auto">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDING STORY */}
      <section id="why-us" className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <Badge className="bg-slate-200 text-slate-700 border-slate-300 mb-4 text-xs font-medium px-4 py-1">
              Why we built this
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
              We built FieldFlowPro because we needed it.
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-5">
              <p className="text-base sm:text-lg">
                Tim Parrow runs four service companies in Vermont. His kids each started their own field service business — handyman, cleaning, landscaping. He needed one place to see all of them without logging in and out, paying four separate software bills, or missing what was happening in the field.
              </p>

              <p className="text-base sm:text-lg">
                When a technician started leaving estimates as 'pending' — collecting cash on printed quotes that never became jobs or invoices — the built-in AI agent caught it. It flagged the inconsistency between time spent in the field and zero deposit or job activity. No other field service software would have caught that.
              </p>

              <p className="text-base sm:text-lg font-medium text-slate-800">
                That's why FieldFlowPro exists. Built by operators, for operators.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                TP
              </div>
              <div>
                <p className="font-semibold text-slate-900">Tim Parrow</p>
                <p className="text-slate-500 text-sm">Parrow Enterprises, Milton VT</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR — 3 CARDS */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Built for the businesses everyone else ignores
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Most field service software is built for large enterprise teams. FieldFlowPro is built for the rest of us.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: Hammer,
                title: "Handyman businesses",
                description:
                  "Handymen have been told to use software built for plumbers or HVAC companies. FieldFlowPro was built with the handyman workflow in mind — quotes, small jobs, materials tracking, and getting paid fast.",
                gradient: "from-amber-400 to-orange-500",
              },
              {
                icon: Sparkles,
                title: "Cleaning side-hustles",
                description:
                  "Running a cleaning business on nights and weekends shouldn't require enterprise software. Track your clients, schedule recurring jobs, send invoices, and look professional — without the complexity.",
                gradient: "from-emerald-400 to-teal-500",
              },
              {
                icon: Building2,
                title: "Multi-company operators",
                description:
                  "Own more than one company? Run a franchise? Have kids with their own businesses under your umbrella? One login switches between every company. One price book shared across all of them. One flat monthly rate.",
                gradient: "from-indigo-400 to-purple-500",
              },
            ].map(({ icon: Icon, title, description, gradient }) => (
              <div
                key={title}
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-shadow group"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-3">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRY PATHS — 4 VISUAL CARDS */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              FieldFlowPro works for your type of work
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {[
              {
                image:
                  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80",
                badge: "Handyman Services",
                text: "Track repairs, estimates, materials, and follow-ups so every job feels professional",
              },
              {
                image:
                  "https://images.unsplash.com/photo-1580256081112-e49377338b7f?w=800&auto=format&fit=crop&q=80",
                badge: "Cleaning Companies",
                text: "Manage recurring cleanings, Airbnb turnovers, and side-hustle schedules without scattered texts",
              },
              {
                image:
                  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80",
                badge: "Multi-Company / Franchise",
                text: "Switch between subsidiary companies with one click. One login, one price book, full visibility",
              },
              {
                image:
                  "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80",
                badge: "Repair & Maintenance",
                text: "Organize urgent fixes, routine service, and work order tracking in one simple field workflow",
              },
            ].map(({ image, badge, text }) => (
              <div
                key={badge}
                className="relative rounded-2xl overflow-hidden aspect-[4/3] group cursor-pointer"
              >
                <img
                  src={image}
                  alt={badge}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white/90 text-slate-800 border-0 text-xs font-semibold px-3 py-1">
                    {badge}
                  </Badge>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                  <p className="text-white text-sm sm:text-base font-medium leading-relaxed">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI FEATURES */}
      <section id="ai" className="py-16 sm:py-24 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 sm:mb-20">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mb-5 text-xs font-semibold px-4 py-1.5">
              AI-Powered Protection
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              You can't watch every job.
              <br />
              <span className="text-purple-400">We can.</span>
            </h2>
            <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              FieldFlowPro comes with built-in AI agents that watch your operation around the clock — catching problems, surfacing insights, and protecting your revenue before you even know there's an issue.
            </p>
          </div>

          {/* FORGE — Featured Fraud Detection Card */}
          <div className="relative bg-slate-800/50 border border-purple-500/30 rounded-3xl p-6 sm:p-10 mb-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs font-bold px-3 py-1">
                  Featured
                </Badge>
                <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs px-3 py-1">
                  Forge — Fraud Detection Agent
                </Badge>
              </div>

              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                    Caught a thief. Before it got worse.
                  </h3>
                  <div className="text-slate-300 text-sm sm:text-base leading-relaxed space-y-3 max-w-3xl">
                    <p>
                      A technician was leaving estimates marked as 'pending' — then collecting cash payments on printed quotes that never became jobs or invoices in the system. No record. No deposit. No paper trail.
                    </p>
                    <p>
                      Forge flagged it automatically. It detected the inconsistency between time spent in the field and zero deposit or job activity on those estimates. The pattern was caught before it became a serious problem.
                    </p>
                    <p className="text-white font-medium">
                      No other field service software would have found that.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-700/50">
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  <span className="text-purple-400 font-semibold">How it works:</span> Forge monitors estimate-to-job conversion rates, deposit patterns, field time vs. billing activity, and flags anomalies for owner review.
                </p>
              </div>
            </div>
          </div>

          {/* 3 Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                icon: Zap,
                name: "Flow",
                subtitle: "Workflow Assistant",
                description:
                  "Guides techs through jobs, surfaces customer history before they knock on the door, and helps new team members learn your workflow without a training manual.",
                color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
                iconColor: "text-amber-400",
                iconBg: "bg-amber-500/20",
              },
              {
                icon: MapPin,
                name: "Dispatch Intelligence",
                subtitle: null,
                description:
                  "Watches your schedule for gaps, conflicts, and inefficiencies. Suggests optimal routing and flags jobs at risk of running over time.",
                color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
                iconColor: "text-blue-400",
                iconBg: "bg-blue-500/20",
              },
              {
                icon: DollarSign,
                name: "Invoice & Collections",
                subtitle: null,
                description:
                  "Monitors unpaid invoices, sends automated follow-up reminders, and flags jobs where payment is overdue based on your terms.",
                color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
                iconColor: "text-emerald-400",
                iconBg: "bg-emerald-500/20",
              },
            ].map(({ icon: Icon, name, subtitle, description, color, iconColor, iconBg }) => (
              <div
                key={name}
                className={`bg-gradient-to-br ${color} border rounded-2xl p-6 hover:shadow-lg hover:shadow-purple-500/5 transition-all`}
              >
                <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <h3 className="font-bold text-white text-base mb-1">{name}</h3>
                {subtitle && (
                  <p className="text-slate-400 text-xs mb-2">{subtitle}</p>
                )}
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          {/* Bottom Callout */}
          <div className="mt-14 sm:mt-20 bg-slate-800/50 border border-slate-700/50 rounded-2xl px-6 py-10 sm:py-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-purple-400" />
              <p className="text-white text-base sm:text-lg font-medium">
                Every FieldFlowPro plan includes all AI agents.
              </p>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              No add-ons. No extra subscriptions. No Zapier required.
            </p>
            <Link to="/Register">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white gap-2 px-8 text-base py-6 sm:py-4">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section id="compare" className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <Badge className="bg-green-50 text-green-700 border-green-200 mb-4 text-xs font-medium px-4 py-1">
              Simple comparison
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              FieldFlowPro vs the other guys
            </h2>
            <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto">
              If you're comparing field service software, start with what actually matters to a working operator.
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-4 px-4 sm:px-6 font-semibold text-slate-700 text-sm">
                    What matters
                  </th>
                  <th className="py-4 px-3 sm:px-5 font-semibold text-sm text-center bg-green-50/50">
                    <span className="text-green-700">FieldFlowPro</span>
                  </th>
                  <th className="py-4 px-3 sm:px-5 font-semibold text-sm text-center">
                    Jobber
                  </th>
                  <th className="py-4 px-3 sm:px-5 font-semibold text-sm text-center">
                    Housecall Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Multiple companies, one login", ffp: "✅ Included", j: "❌ Separate accounts", hp: "❌ Separate accounts" },
                  { feature: "Shared price book across companies", ffp: "✅ Included", j: "❌ Not available", hp: "❌ Not available" },
                  { feature: "Flat rate — no per-user fees", ffp: "✅ Always", j: "❌ Charges per user", hp: "❌ Charges per user" },
                  { feature: "Built-in AI fraud detection", ffp: "✅ Forge included", j: "❌ None", hp: "❌ None" },
                  { feature: "Built-in AI workflow agent", ffp: "✅ Flow included", j: "❌ None", hp: "❌ None" },
                  { feature: "Free trial", ffp: "✅ 14 days free", j: "⚠️ Demo required", hp: "⚠️ Demo required" },
                  { feature: "Built by service business owners", ffp: "✅ Yes", j: "❌ No", hp: "❌ No" },
                  { feature: "Starting price", ffp: "$99/mo", j: "$39/mo (1 user only)", hp: "$59/mo (limited)" },
                ].map(({ feature, ffp, j, hp }, i) => (
                  <tr
                    key={feature}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium">
                      {feature}
                    </td>
                    <td className="py-3.5 px-3 sm:px-5 text-center bg-green-50/30">
                      <span className={`text-xs sm:text-sm font-semibold ${ffp.startsWith("✅") ? "text-green-700" : ffp.startsWith("$") ? "text-green-700" : "text-green-700"}`}>
                        {ffp}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 sm:px-5 text-center">
                      <span className={`text-xs sm:text-sm ${j.startsWith("❌") ? "text-red-500" : j.startsWith("⚠️") ? "text-amber-600" : "text-slate-600"}`}>
                        {j}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 sm:px-5 text-center">
                      <span className={`text-xs sm:text-sm ${hp.startsWith("❌") ? "text-red-500" : hp.startsWith("⚠️") ? "text-amber-600" : "text-slate-600"}`}>
                        {hp}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-slate-400 text-xs sm:text-sm mt-5 leading-relaxed">
            *Jobber's $39/mo Core plan supports 1 user only. A 5-person team on Jobber runs $149/mo — same price as FieldFlowPro Growth, which has no user cap and supports up to 3 companies.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link to="/Register">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white gap-2 px-8 w-full sm:w-auto text-base py-6 sm:py-4">
                Try FieldFlowPro Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#why-us">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-300 text-slate-700 gap-2 px-8 text-base py-6 sm:py-4">
                See How Switching Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 mb-4 text-xs font-medium px-4 py-1">
              Everything you need
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              One platform. Every workflow.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                icon: LayoutGrid,
                title: "Multi-Company Dashboard",
                description:
                  "Switch between every company you own with one click. One login, one password, full visibility across your entire operation. No logging out. No separate accounts.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: ClipboardCheck,
                title: "Estimates & Job Tracking",
                description:
                  "Create professional estimates in minutes. Convert them to jobs with one click. Track status, assign techs, add materials, and close jobs fast.",
                color: "bg-emerald-50 text-emerald-600",
              },
              {
                icon: ReceiptText,
                title: "Invoicing in Minutes",
                description:
                  "Customer → Estimate → Job → Invoice. That's the whole workflow. Your team learns it in a day. Invoicing that used to take 2+ hours now takes 20 minutes.",
                color: "bg-violet-50 text-violet-600",
              },
              {
                icon: Tag,
                title: "Shared Price Book",
                description:
                  "Set up your services and materials once. Use them across every company. When you update a price, it updates everywhere. No re-entering the same line items in four accounts.",
                color: "bg-amber-50 text-amber-600",
              },
              {
                icon: Users,
                title: "Team Management",
                description:
                  "Add your whole team once. Assign techs across companies. Flat rate — no per-user fees no matter how many people you add.",
                color: "bg-cyan-50 text-cyan-600",
              },
              {
                icon: GitBranch,
                title: "Subsidiary & Franchise Ready",
                description:
                  "Running a franchise? Have kids with their own companies under your umbrella? Create a parent company and add subsidiaries. Each has its own data, their own team — you see all of it from one login.",
                color: "bg-rose-50 text-rose-600",
              },
            ].map(({ icon: Icon, title, description, color }) => (
              <div
                key={title}
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 hover:shadow-md transition-shadow"
              >
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 mb-4 text-xs font-medium px-4 py-1">
              Simple pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Flat rate. No surprises. No per-user fees.
            </h2>
            <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto">
              Pick your plan based on how many companies you run. Add subsidiaries as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$99",
                period: "/mo",
                subtitle: "Perfect for solo operators and small crews",
                features: [
                  "1 company included",
                  "Unlimited jobs",
                  "Unlimited team members",
                  "Estimates, jobs & invoices",
                  "Shared price book",
                  "Flow AI agent included",
                  "Forge fraud detection included",
                  "14-day free trial",
                ],
                popular: false,
                order: "lg:order-1",
              },
              {
                name: "Growth",
                price: "$149",
                period: "/mo",
                subtitle: "For growing teams running multiple locations",
                features: [
                  "3 companies included",
                  "Everything in Starter",
                  "+$29/mo per additional company",
                  "Multi-company dashboard",
                  "Custom email branding",
                  "Priority support",
                  "All AI agents included",
                  "14-day free trial",
                ],
                popular: true,
                order: "lg:order-2 order-first",
              },
              {
                name: "Pro",
                price: "$299",
                period: "/mo",
                subtitle: "For serious operators running multiple companies at scale",
                features: [
                  "10 companies included",
                  "Everything in Growth",
                  "+$19/mo per additional company",
                  "White label ready",
                  "API access",
                  "Advanced reporting",
                  "Dedicated support",
                  "All AI agents included",
                  "14-day free trial",
                ],
                popular: false,
                order: "lg:order-3",
              },
            ].map(({ name, price, period, subtitle, features, popular, order }) => (
              <div
                key={name}
                className={`relative rounded-2xl border-2 p-6 sm:p-8 flex flex-col ${order} ${
                  popular
                    ? "border-blue-500 bg-white shadow-xl scale-[1.02] lg:scale-105 z-10"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                {popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white border-0 text-xs font-bold px-4 py-1 shadow-md">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900 mb-1">{name}</h3>
                <p className="text-slate-500 text-sm mb-4">{subtitle}</p>
                <div className="mb-6">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900">{price}</span>
                  <span className="text-slate-400 text-base">{period}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/Register" className="mt-auto">
                  <Button
                    className={`w-full gap-2 ${
                      popular
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Lifetime — One-time purchase */}
          <div className="mt-10 sm:mt-14 max-w-3xl mx-auto">
            <div className="relative rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-white p-6 sm:p-8 shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-emerald-600 text-white border-0 text-xs font-bold px-3 py-1">
                      One-Time Purchase
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Lifetime — All Access</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    Every feature, every module, every AI agent — included forever. No monthly fees, ever.
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
                    {[
                      "Everything in Pro, unlocked forever",
                      "All current & future modules included",
                      "Unlimited companies",
                      "All AI agents included",
                      "White label ready",
                      "No monthly fees, ever",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="md:w-64 flex-shrink-0 md:text-center">
                  <div className="mb-3 md:text-center">
                    <span className="text-4xl font-extrabold text-slate-900">$2,500</span>
                    <span className="text-slate-400 text-sm block">one-time payment</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Company name"
                    value={lifetimeCompany}
                    onChange={(e) => setLifetimeCompany(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={lifetimeEmail}
                    onChange={(e) => setLifetimeEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Button
                    onClick={handleBuyLifetime}
                    disabled={lifetimeLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    {lifetimeLoading ? "Starting checkout..." : "Buy Now"}
                  </Button>
                  <p className="text-slate-400 text-xs text-center mt-2">Secure checkout via Stripe</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-10 sm:mt-14">
            <p className="text-slate-500 text-sm mb-2">
              Need more than 10 companies? Running a franchise network?{" "}
              <a href="mailto:support@fieldflowpro.com" className="text-blue-600 font-medium hover:underline">
                Contact us for Enterprise pricing
              </a>
            </p>
            <p className="text-slate-400 text-xs">
              All plans include flat-rate pricing, no per-user fees, all AI agents, and a free 14-day trial.
            </p>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL SECTION */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <div className="text-6xl sm:text-8xl text-slate-300 font-serif leading-none mb-6 sm:mb-8">"</div>
            <blockquote className="text-base sm:text-xl text-slate-700 leading-relaxed italic mb-8">
              We run four companies — handyman, cleaning, landscaping, and detailing — with 7 techs across all of them. FieldFlowPro is the only software that handles all of it from one login. Invoicing used to take over two hours a week. Now it takes 20 minutes. And when the fraud detection agent flagged a problem before it got worse — that alone paid for years of the subscription.
            </blockquote>
            <div className="text-slate-900 font-semibold text-sm sm:text-base">Tim Parrow</div>
            <div className="text-slate-500 text-xs sm:text-sm">Parrow Enterprises · Milton, Vermont</div>
            <Badge className="bg-white border border-slate-200 text-slate-600 mt-6 text-xs font-medium px-4 py-1">
              Built by the same team that uses it every day
            </Badge>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 sm:py-24 bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Ready to run your whole operation from one login?
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-8 leading-relaxed">
            Start your free 14-day trial today. Your whole team up and running in under an hour.
          </p>
          <Link to="/Register">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 sm:px-10 w-full sm:w-auto text-base py-6 sm:py-4 shadow-lg shadow-blue-600/25">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-slate-500 text-xs sm:text-sm mt-6">
            Questions? Email us at{" "}
            <a href="mailto:support@fieldflowpro.com" className="text-blue-400 hover:underline">
              support@fieldflowpro.com
            </a>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-1">
              <img
                src="https://media.base44.com/images/public/69b20e4261ce8a3e5bf093b0/408bce6f6_LGipynfh-removebg-preview.png"
                alt="FieldFlow Pro"
                className="h-8 w-auto brightness-0 invert"
              />
              <p className="text-xs text-slate-500">Built by operators, for operators.</p>
            </div>
            <div className="flex gap-6 text-sm flex-wrap justify-center">
              <Link to="/Articles" className="hover:text-white transition-colors">Articles</Link>
              <a href="#compare" className="hover:text-white transition-colors">Compare</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <a href="mailto:support@fieldflowpro.com" className="hover:text-white transition-colors">Contact</a>
              <Link to="/CustomerPortal" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Customer Portal</Link>
            </div>
            <p className="text-xs text-slate-600">© 2026 FieldFlowPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}