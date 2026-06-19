import { Link } from "react-router-dom";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Menu, X, ArrowRight, Hammer, Sparkles, Building2, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignIn = () => {
    base44.auth.redirectToLogin(`${window.location.origin}/Dashboard`);
  };

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
            <a href="#why-us" className="hover:text-slate-900 transition-colors">Compare</a>
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
            {[
              { href: "#why-us", label: "Compare" },
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
                No credit card required · No setup fees · Your whole team running in under an hour
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

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src="https://media.base44.com/images/public/69b20e4261ce8a3e5bf093b0/408bce6f6_LGipynfh-removebg-preview.png"
                alt="FieldFlow Pro"
                className="h-8 w-auto brightness-0 invert"
              />
            </div>
            <div className="flex gap-6 text-sm flex-wrap justify-center">
              <a href="#why-us" className="hover:text-white transition-colors">Why Us</a>
              <a href="#ai" className="hover:text-white transition-colors">AI Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <Link to="/Register" className="hover:text-white transition-colors">Sign Up</Link>
              <Link to="/CustomerPortal" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Customer Portal</Link>
            </div>
            <p className="text-xs text-slate-600">© 2026 FieldFlow Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}