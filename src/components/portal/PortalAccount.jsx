import { useState } from "react";
import { User, Phone, Mail, MapPin, MessageCircle, PlusCircle, ChevronRight, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PortalAccount({ customer, company, services }) {
  const accentColor = company?.primary_color || "#2563eb";
  const [section, setSection] = useState("profile"); // profile | book | messages
  const [bookingForm, setBookingForm] = useState({ service_type: "", preferred_date: "", preferred_time: "9:00 AM", notes: "" });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  async function submitBooking(e) {
    e.preventDefault();
    setBookingLoading(true);
    await base44.functions.invoke("submitBooking", {
      ...bookingForm,
      company_id: company.id,
      customer_id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    });
    setBookingLoading(false);
    setBookingSubmitted(true);
  }

  const profileFields = [
    { label: "Full Name", value: `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim(), icon: User },
    { label: "Email", value: customer?.email, icon: Mail },
    { label: "Phone", value: customer?.phone, icon: Phone },
    { label: "Service Address", value: [customer?.address, customer?.city, customer?.state, customer?.zip].filter(Boolean).join(", "), icon: MapPin },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 mb-5">My Account</h1>

      {/* Section tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { id: "profile", label: "Profile" },
          { id: "book", label: "Request Service" },
          { id: "messages", label: "Contact Us" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              section === tab.id ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200"
            }`}
            style={section === tab.id ? { backgroundColor: accentColor } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === "profile" && (
        <div className="space-y-3">
          {profileFields.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{value || "—"}</p>
              </div>
            </div>
          ))}

          {/* Referral */}
          {company?.portal_settings?.referral_enabled !== false && (
            <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">Refer a friend 🎁</p>
              <p className="text-xs text-slate-600 mb-3">
                {company?.portal_settings?.referral_message || "Know someone who could use our services? Share your referral link!"}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/Booking?ref=${customer?.first_name?.toLowerCase()}-${customer?.last_name?.toLowerCase()}`)}
                className="text-xs font-bold px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: accentColor }}
              >
                Copy Referral Link
              </button>
            </div>
          )}
        </div>
      )}

      {section === "book" && (
        <div>
          {bookingSubmitted ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-800 mb-2">Request Sent!</h2>
              <p className="text-slate-500 text-sm mb-5">We'll confirm your appointment soon.</p>
              <button
                onClick={() => { setBookingSubmitted(false); setBookingForm({ service_type: "", preferred_date: "", preferred_time: "9:00 AM", notes: "" }); }}
                className="text-sm font-semibold px-6 py-2.5 rounded-xl text-white"
                style={{ backgroundColor: accentColor }}
              >
                Book Another
              </button>
            </div>
          ) : (
            <form onSubmit={submitBooking} className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Service *</label>
                  {services.length > 0 ? (
                    <select
                      required
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white"
                      value={bookingForm.service_type}
                      onChange={e => setBookingForm({ ...bookingForm, service_type: e.target.value })}
                    >
                      <option value="">Select a service...</option>
                      {services.map(svc => (
                        <option key={svc.id} value={svc.name}>{svc.name}{svc.unit_price > 0 ? ` — $${svc.unit_price}` : ""}</option>
                      ))}
                      <option value="Other">Other / Not listed</option>
                    </select>
                  ) : (
                    <input
                      required
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                      value={bookingForm.service_type}
                      onChange={e => setBookingForm({ ...bookingForm, service_type: e.target.value })}
                      placeholder="Describe what you need..."
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Date *</label>
                    <input
                      required type="date"
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                      value={bookingForm.preferred_date}
                      onChange={e => setBookingForm({ ...bookingForm, preferred_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Time</label>
                    <select
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                      value={bookingForm.preferred_time}
                      onChange={e => setBookingForm({ ...bookingForm, preferred_time: e.target.value })}
                    >
                      {["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Notes</label>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none"
                    rows={3}
                    value={bookingForm.notes}
                    onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    placeholder="Any special instructions or details..."
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-opacity disabled:opacity-60"
                style={{ backgroundColor: accentColor }}
              >
                {bookingLoading ? "Sending..." : "Send Request"}
              </button>
            </form>
          )}
        </div>
      )}

      {section === "messages" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
          <MessageCircle className="w-14 h-14 mx-auto mb-4 text-slate-200" />
          <h2 className="text-lg font-bold text-slate-700 mb-2">Get in Touch</h2>
          <p className="text-slate-500 text-sm mb-5">Contact us directly using the information below.</p>
          <div className="space-y-3">
            {company?.phone && (
              <a href={`tel:${company.phone}`} className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-colors">
                <Phone className="w-4 h-4" /> {company.phone}
              </a>
            )}
            {company?.email && (
              <a href={`mailto:${company.email}`} className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-colors">
                <Mail className="w-4 h-4" /> {company.email}
              </a>
            )}
            {!company?.phone && !company?.email && (
              <p className="text-slate-400 text-sm">Contact information not available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}