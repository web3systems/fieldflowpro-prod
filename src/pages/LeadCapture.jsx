import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function LeadCapture() {
  const params = new URLSearchParams(window.location.search);
  const companyId = params.get("company_id");

  const [company, setCompany] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    address: "", service_interest: "", notes: ""
  });

  useEffect(() => {
    async function init() {
      if (!companyId) { setLoading(false); return; }
      try {
        const companies = await base44.entities.Company.list();
        const found = companies.find(c => c.id === companyId);
        setCompany(found || null);
      } catch (e) {}
      setLoading(false);
    }
    init();
  }, [companyId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await base44.functions.invoke('submitLead', { ...form, company_id: companyId });
      setSubmitted(true);
    } catch (err) {
      console.error('Lead submit error:', err);
      setSubmitError('Something went wrong. Please try again or call us directly.');
    } finally {
      setSubmitting(false);
    }
  }

  const headerColor = company?.primary_color || "#1e40af";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center border-0 shadow-lg">
          <CardContent className="p-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Invalid Link</p>
            <p className="text-slate-400 text-sm mt-1">Please contact the company for a valid link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${headerColor}20` }}>
              <CheckCircle className="w-8 h-8" style={{ color: headerColor }} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Thanks for reaching out!</h2>
            <p className="text-slate-500 text-sm">
              We received your info and will be in touch soon, {form.first_name}!
            </p>
            {company?.phone && (
              <p className="text-sm text-slate-500 mt-4">
                Need immediate help? Call us: <a href={`tel:${company.phone}`} className="font-semibold" style={{ color: headerColor }}>{company.phone}</a>
              </p>
            )}
            <p className="text-sm font-semibold text-slate-600 mt-4">{company?.name}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="py-8 px-4 text-white text-center" style={{ backgroundColor: headerColor }}>
        <h1 className="text-2xl font-bold">{company?.name || "Get a Free Quote"}</h1>
        <p className="text-white/80 text-sm mt-1">Fill out the form below and we'll get back to you shortly</p>
      </div>

      <div className="max-w-lg mx-auto p-4 mt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold text-slate-800">Your Information</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name *</Label>
                  <Input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Email *</Label>
                <Input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Address / Service Location</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Where do you need service?" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold text-slate-800">What do you need?</h2>
              <div>
                <Label>Service Needed *</Label>
                <Input required value={form.service_interest} onChange={e => setForm({ ...form, service_interest: e.target.value })} placeholder="e.g. Lawn care, painting, cleaning..." />
              </div>
              <div>
                <Label>Additional Details</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any extra details about your project..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{submitError}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base font-semibold text-white"
            style={{ backgroundColor: headerColor }}
          >
            {submitting ? "Submitting..." : "Get My Free Quote"}
          </Button>

          <p className="text-center text-xs text-slate-400">We respect your privacy and will never share your information.</p>
        </form>
      </div>
    </div>
  );
}