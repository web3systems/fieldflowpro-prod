import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, Clock, CalendarX } from "lucide-react";

const SERVICE_TIMES = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
];

export default function Booking() {
  const params = new URLSearchParams(window.location.search);
  const companyId = params.get("company_id");

  const [company, setCompany] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingBookings, setExistingBookings] = useState([]);
  const [conflictInfo, setConflictInfo] = useState(null); // { suggestedTime, suggestedDate }
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    address: "", service_type: "", preferred_date: "",
    preferred_time: "9:00 AM", notes: ""
  });

  useEffect(() => {
    async function init() {
      if (!companyId) { setLoading(false); return; }
      try {
        const [companies, bookings] = await Promise.all([
          base44.entities.Company.list(),
          base44.entities.ServiceBooking.filter({ company_id: companyId }),
        ]);
        const found = companies.find(c => c.id === companyId);
        setCompany(found || null);
        setExistingBookings(bookings.filter(b => b.status !== "cancelled"));
        // Try to prefill from logged-in user
        try {
          const u = await base44.auth.me();
          const customers = await base44.entities.Customer.filter({ company_id: companyId });
          const matched = customers.find(c => c.email === u.email);
          if (matched) {
            setForm(f => ({
              ...f,
              first_name: matched.first_name || "",
              last_name: matched.last_name || "",
              email: matched.email || u.email || "",
              phone: matched.phone || "",
              address: matched.address || "",
            }));
          } else if (u.email) {
            setForm(f => ({ ...f, email: u.email }));
          }
        } catch (e) { /* not logged in */ }
      } catch (e) { /* ignore */ }
      setLoading(false);
    }
    init();
  }, [companyId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    await base44.functions.invoke('submitBooking', { ...form, company_id: companyId });
    setSubmitted(true);
    setSubmitting(false);
  }

  const headerColor = company?.primary_color || "#1e40af";
  const today = new Date().toISOString().split("T")[0];

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
            <p className="font-semibold text-slate-700">Invalid Booking Link</p>
            <p className="text-slate-400 text-sm mt-1">Please contact the company for a valid booking link.</p>
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
            <h2 className="text-xl font-bold text-slate-800 mb-2">Booking Request Sent!</h2>
            <p className="text-slate-500 text-sm">
              Thank you, {form.first_name}! We've received your request and will confirm your appointment shortly.
            </p>
            {company?.phone && (
              <p className="text-sm text-slate-500 mt-4">Questions? Call us: <a href={`tel:${company.phone}`} className="font-semibold" style={{ color: headerColor }}>{company.phone}</a></p>
            )}
            <p className="text-sm font-semibold text-slate-600 mt-4">{company?.name}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="py-8 px-4 text-white text-center" style={{ backgroundColor: headerColor }}>
        <h1 className="text-2xl font-bold">{company?.name || "Book a Service"}</h1>
        <p className="text-white/80 text-sm mt-1">Request an appointment — we'll confirm shortly</p>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 mt-2">
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
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Service Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Where should we come?" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold text-slate-800">Service Details</h2>
              <div>
                <Label>What service do you need? *</Label>
                <Input required value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} placeholder="e.g. Lawn Mowing, Deep Clean, Repair..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preferred Date *</Label>
                  <Input required type="date" min={today} value={form.preferred_date} onChange={e => setForm({ ...form, preferred_date: e.target.value })} />
                </div>
                <div>
                  <Label>Preferred Time</Label>
                  <Select value={form.preferred_time} onValueChange={v => setForm({ ...form, preferred_time: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Additional Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions or details..." rows={3} />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base font-semibold text-white"
            style={{ backgroundColor: headerColor }}
          >
            {submitting ? "Sending Request..." : "Request Appointment"}
          </Button>
        </form>
      </div>
    </div>
  );
}