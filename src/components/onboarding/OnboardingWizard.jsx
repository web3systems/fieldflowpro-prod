import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2, Database, CreditCard, CheckCircle, ChevronRight,
  Sparkles, Zap, ExternalLink, Loader2, X, Phone, Mail,
  MapPin, Globe, ArrowRight, Check
} from "lucide-react";

const STEPS = ["welcome", "company", "testdata", "stripe", "done"];

export default function OnboardingWizard({ company, onComplete }) {
  const [step, setStep] = useState("welcome");
  const [companyForm, setCompanyForm] = useState({
    phone: company?.phone || "",
    email: company?.email || "",
    address: company?.address || "",
    city: company?.city || "",
    state: company?.state || "",
    website: company?.website || "",
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [seedSkipped, setSeedSkipped] = useState(false);
  const [seedError, setSeedError] = useState(null);

  const stepIndex = STEPS.indexOf(step);
  const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);

  async function saveCompany() {
    setSavingCompany(true);
    try {
      await base44.entities.Company.update(company.id, companyForm);
      setCompanySaved(true);
      setTimeout(() => setStep("testdata"), 600);
    } finally {
      setSavingCompany(false);
    }
  }

  async function handleSeedData() {
    setSeedLoading(true);
    setSeedError(null);
    try {
      const res = await base44.functions.invoke("seedTestData", { company_id: company.id });
      if (res.data?.skipped) {
        setSeedSkipped(true);
      } else if (res.data?.success) {
        setSeedDone(true);
      } else {
        setSeedError(res.data?.error || "Something went wrong.");
      }
    } catch (e) {
      setSeedError(e.message);
    } finally {
      setSeedLoading(false);
    }
  }

  function finish() {
    localStorage.setItem(`onboarding_done_${company.id}`, "1");
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to FieldFlow Pro! 🎉</h2>
            <p className="text-slate-500 mb-2">
              Let's get your account set up in just a few steps. This takes about 2 minutes.
            </p>
            <p className="text-sm text-slate-400 mb-8">
              You're on a <strong className="text-blue-600">14-day free trial</strong>.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Building2, label: "Company Profile", color: "text-blue-600 bg-blue-50" },
                { icon: Database, label: "Sample Data", color: "text-emerald-600 bg-emerald-50" },
                { icon: CreditCard, label: "Payments Setup", color: "text-purple-600 bg-purple-50" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-600">{label}</p>
                </div>
              ))}
            </div>
            <Button onClick={() => setStep("company")} className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base gap-2">
              Let's Get Started <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: Company Profile */}
        {step === "company" && (
          <div className="p-8">
            <StepHeader
              icon={Building2}
              iconColor="text-blue-600 bg-blue-50"
              title="Complete your company profile"
              subtitle="This info appears on your estimates and invoices."
              step="1 of 3"
            />
            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input value={companyForm.phone} onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 555-5555" className="pl-9" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Business Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input type="email" value={companyForm.email} onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))} placeholder="hello@yourco.com" className="pl-9" />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Street Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input value={companyForm.address} onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" className="pl-9" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500 mb-1 block">City</Label>
                  <Input value={companyForm.city} onChange={e => setCompanyForm(f => ({ ...f, city: e.target.value }))} placeholder="Austin" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">State</Label>
                  <Input value={companyForm.state} onChange={e => setCompanyForm(f => ({ ...f, state: e.target.value }))} placeholder="TX" maxLength={2} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Website (optional)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input value={companyForm.website} onChange={e => setCompanyForm(f => ({ ...f, website: e.target.value }))} placeholder="https://yourcompany.com" className="pl-9" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("testdata")} className="flex-1">
                Skip for now
              </Button>
              <Button onClick={saveCompany} disabled={savingCompany || companySaved} className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2">
                {savingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : companySaved ? <Check className="w-4 h-4" /> : null}
                {companySaved ? "Saved!" : savingCompany ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Test Data */}
        {step === "testdata" && (
          <div className="p-8">
            <StepHeader
              icon={Database}
              iconColor="text-emerald-600 bg-emerald-50"
              title="Load sample data?"
              subtitle="We'll add demo customers, jobs, estimates, invoices & services so you can explore the app without starting from scratch."
              step="2 of 3"
            />

            {!seedDone && !seedSkipped && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2">
                {[
                  "3 sample customers",
                  "3 jobs (scheduled, in progress, completed)",
                  "2 estimates (sent & approved)",
                  "2 invoices (paid & outstanding)",
                  "3 price book services",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            )}

            {(seedDone || seedSkipped) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-medium text-emerald-700">
                  {seedSkipped ? "Skipped — your existing data is untouched." : "Sample data loaded successfully!"}
                </p>
              </div>
            )}

            {seedError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{seedError}</div>
            )}

            {!seedDone && !seedSkipped ? (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setSeedSkipped(true); setTimeout(() => setStep("stripe"), 600); }} className="flex-1">
                  Skip — I'll add my own
                </Button>
                <Button onClick={handleSeedData} disabled={seedLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2">
                  {seedLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {seedLoading ? "Loading..." : "Yes, load sample data"}
                </Button>
              </div>
            ) : (
              <Button onClick={() => setStep("stripe")} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Step: Stripe Setup */}
        {step === "stripe" && (
          <div className="p-8">
            <StepHeader
              icon={CreditCard}
              iconColor="text-purple-600 bg-purple-50"
              title="Set up payments"
              subtitle="Connect Stripe to collect payments from customers via card, bank transfer, and more."
              step="3 of 3"
            />

            <div className="space-y-3 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">What you'll be able to do:</p>
                {[
                  "Send invoices with a 'Pay Now' button",
                  "Accept credit cards, debit cards & ACH",
                  "Track payments automatically",
                  "Offer deposit requests on jobs",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                    <Check className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Want to test payments first?</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      You can connect Stripe in <strong>test mode</strong> using Stripe's sandbox. No real money moves — perfect for exploring invoices and checkout flows.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="/CompanySettings#stripe"
                onClick={finish}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                <CreditCard className="w-4 h-4" />
                Connect Stripe Now
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
              <Button variant="outline" onClick={() => setStep("done")} className="w-full">
                I'll do this later
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">You're all set!</h2>
            <p className="text-slate-500 mb-8">
              Your workspace is ready. Explore the dashboard, create your first job, or invite a team member to get started.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "Create a Job", href: "/NewJob", icon: Zap, color: "bg-blue-600 text-white" },
                { label: "Add a Customer", href: "/Customers", icon: Building2, color: "bg-slate-900 text-white" },
                { label: "Send an Estimate", href: "/NewEstimate", icon: ArrowRight, color: "bg-purple-600 text-white" },
                { label: "View Settings", href: "/CompanySettings", icon: Building2, color: "bg-slate-100 text-slate-800" },
              ].map(({ label, href, icon: Icon, color }) => (
                <a key={label} href={href} onClick={finish} className={`flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90 ${color}`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </a>
              ))}
            </div>
            <Button onClick={finish} variant="ghost" className="text-slate-400 text-sm">
              Go to Dashboard →
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}

function StepHeader({ icon: Icon, iconColor, title, subtitle, step }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 mb-0.5">Step {step}</p>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}