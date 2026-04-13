import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { PLANS } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Globe, Zap, Shield, Star } from "lucide-react";

const SIGNUP_PLANS = ["starter", "professional", "enterprise"];

export default function Register() {
  const urlParams = new URLSearchParams(window.location.search);
  const [step, setStep] = useState(urlParams.get('welcome') === 'true' ? 'welcome' : 'plan');
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [form, setForm] = useState({ name: "", email: "", company_name: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignup() {
    if (!form.name || !form.email || !form.company_name || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await base44.functions.invoke("startFreeTrial", {
        plan: selectedPlan,
        company_name: form.company_name,
        company_phone: form.phone,
        owner_email: form.email,
        owner_name: form.name,
        password: form.password,
      });

      if (res.data?.success) {
        setStep('welcome');
      } else {
        setError(res.data?.error || "Could not start trial. Please try again.");
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">You're all set!</h1>
          <p className="text-blue-200 text-lg mb-6">
            Your account and 14-day free trial are ready to go.
          </p>
          <a href="/Dashboard" className="inline-block bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
            Go to Dashboard →
          </a>
          <p className="text-blue-400 text-xs mt-4">Didn't get an email? Check your spam folder or contact support@fieldflowpro.com</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <img src="https://media.base44.com/images/public/69b20e4261ce8a3e5bf093b0/408bce6f6_LGipynfh-removebg-preview.png" alt="FieldFlow Pro" className="h-10 w-auto brightness-0 invert" />
        </div>
        <a href="/Dashboard" className="text-blue-300 text-sm hover:text-white transition-colors">
          Already have an account? Sign in →
        </a>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Start your free 14-day trial</h1>
          <p className="text-blue-200 text-lg">No credit card required to start. Cancel anytime.</p>
        </div>

      {step === "plan" ? (
          <>
            <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mb-8">
              {SIGNUP_PLANS.map(planKey => {
                const plan = PLANS[planKey];
                const isSelected = selectedPlan === planKey;
                return (
                  <button
                    key={planKey}
                    onClick={() => setSelectedPlan(planKey)}
                    className={`relative text-left rounded-2xl p-6 border-2 transition-all ${
                      isSelected
                        ? "border-blue-400 bg-white/10 shadow-xl shadow-blue-500/20"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white border-0 gap-1">
                        <Star className="w-3 h-3" /> Most Popular
                      </Badge>
                    )}
                    <div className="mb-4">
                      <p className="text-white font-bold text-lg">{plan.name}</p>
                      <div className="flex items-end gap-1 mt-1">
                        <span className="text-3xl font-bold text-white">${plan.price}</span>
                        <span className="text-blue-300 text-sm mb-1">/month</span>
                      </div>
                      <p className="text-blue-300 text-xs mt-1">
                        {plan.limits.users ? `Up to ${plan.limits.users} users` : "Unlimited users"}
                        {plan.limits.jobs_per_month ? ` · ${plan.limits.jobs_per_month} jobs/mo` : " · Unlimited jobs"}
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-blue-100">
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-white/20 text-center text-sm text-blue-300 font-medium">
                        ✓ Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-blue-300 text-sm">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> 14-day free trial</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Setup in minutes</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Cancel anytime</span>
            </div>

            <Button
              className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-10 py-3 text-base h-auto rounded-xl"
              onClick={() => setStep("info")}
            >
              Get Started with {PLANS[selectedPlan].name} →
            </Button>
          </>
        ) : (
          <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create your account</h2>
              <button onClick={() => setStep("plan")} className="text-blue-300 text-sm hover:text-white">← Back</button>
            </div>
            <div className="mb-5 p-3 rounded-xl bg-blue-500/20 border border-blue-400/30">
              <p className="text-blue-200 text-sm">
                <strong className="text-white">{PLANS[selectedPlan].name}</strong> — ${PLANS[selectedPlan].price}/mo
                <span className="ml-2 text-green-300 text-xs">14 days free</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-blue-200 text-sm">Your Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50" />
              </div>
              <div>
                <Label className="text-blue-200 text-sm">Work Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@yourcompany.com" className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50" />
              </div>
              <div>
                <Label className="text-blue-200 text-sm">Company Name *</Label>
                <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Acme Cleaning Co." className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50" />
              </div>
              <div>
                <Label className="text-blue-200 text-sm">Phone (optional)</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 555-5555" className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50" />
              </div>
              <div>
                <Label className="text-blue-200 text-sm">Password *</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="At least 8 characters" className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50" />
              </div>

              {error && (
                <p className="text-red-300 text-sm bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button onClick={handleSignup} disabled={loading} className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3 h-auto rounded-xl text-base mt-2">
                {loading ? "Setting up..." : "Start Free Trial →"}
              </Button>
              <p className="text-blue-300 text-xs text-center">
                By signing up you agree to our{" "}
                <a href="/TermsOfService" target="_blank" className="underline hover:text-white">Terms of Service</a>{" "}and{" "}
                <a href="/PrivacyPolicy" target="_blank" className="underline hover:text-white">Privacy Policy</a>.
                No credit card needed to start.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}