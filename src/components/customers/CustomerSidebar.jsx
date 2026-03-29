import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Edit2, Check, X, Tag, Plus, ExternalLink, Bell, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function CustomerSidebar({ customer, invoices, onUpdate, onPortalInvite, sendingInvite }) {
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({});
  const [newTag, setNewTag] = useState("");

  const lifetimeValue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const outstanding = invoices.filter(i => ["sent","viewed","partial","overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);

  function startEditContact() {
    setContactForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zip: customer.zip || "",
    });
    setEditingContact(true);
  }

  async function saveContact() {
    await onUpdate(contactForm);
    setEditingContact(false);
  }

  async function addTag() {
    if (!newTag.trim()) return;
    const tags = [...(customer.tags || []), newTag.trim()];
    await onUpdate({ tags });
    setNewTag("");
  }

  async function removeTag(tag) {
    const tags = (customer.tags || []).filter(t => t !== tag);
    await onUpdate({ tags });
  }

  async function togglePref(field) {
    await onUpdate({ [field]: !customer[field] });
  }

  return (
    <div className="space-y-4">
      {/* Contact Info */}
      <div className="bg-white rounded-xl shadow-sm border-0 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Contact info</h3>
          {!editingContact && (
            <button onClick={startEditContact} className="p-1 text-slate-400 hover:text-slate-700">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {editingContact ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="First" value={contactForm.first_name} onChange={e => setContactForm(f => ({ ...f, first_name: e.target.value }))} className="text-sm h-8" />
              <Input placeholder="Last" value={contactForm.last_name} onChange={e => setContactForm(f => ({ ...f, last_name: e.target.value }))} className="text-sm h-8" />
            </div>
            <Input placeholder="Email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} className="text-sm h-8" />
            <Input placeholder="Phone" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} className="text-sm h-8" />
            <Input placeholder="Address" value={contactForm.address} onChange={e => setContactForm(f => ({ ...f, address: e.target.value }))} className="text-sm h-8" />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="City" value={contactForm.city} onChange={e => setContactForm(f => ({ ...f, city: e.target.value }))} className="text-sm h-8 col-span-2" />
              <Input placeholder="ST" value={contactForm.state} onChange={e => setContactForm(f => ({ ...f, state: e.target.value }))} className="text-sm h-8" maxLength={2} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveContact} className="flex-1 h-7 bg-blue-600 hover:bg-blue-700 text-xs">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingContact(false)} className="flex-1 h-7 text-xs">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-400">Contact</p>
              <p className="text-sm text-slate-800 font-medium">{customer.first_name} {customer.last_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Phone</p>
              {customer.phone
                ? <a href={`tel:${customer.phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</a>
                : <p className="text-sm text-slate-400">—</p>
              }
            </div>
            <div>
              <p className="text-xs text-slate-400">Email</p>
              {customer.email
                ? <a href={`mailto:${customer.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all"><Mail className="w-3 h-3" />{customer.email}</a>
                : <p className="text-sm text-slate-400">—</p>
              }
            </div>
            <div>
              <p className="text-xs text-slate-400">Address</p>
              {customer.address
                ? <p className="text-sm text-slate-700 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />{customer.address}{customer.city ? `, ${customer.city}` : ""}{customer.state ? `, ${customer.state}` : ""} {customer.zip || ""}</p>
                : <p className="text-sm text-slate-400">—</p>
              }
            </div>
            <div className="pt-1">
              <p className="text-xs text-slate-400 mb-1">Customer portal</p>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onPortalInvite} disabled={!customer.email || sendingInvite}>
                <ExternalLink className="w-3 h-3" />{sendingInvite ? "Sending..." : "Send invite"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border-0 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Summary</h3>
        <div>
          <p className="text-xs text-slate-400">Created</p>
          <p className="text-sm text-slate-700">{customer.created_date ? format(new Date(customer.created_date), "MM/dd/yyyy") : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-blue-500 font-medium">Lifetime value</p>
          <p className="text-sm font-semibold text-slate-800">${lifetimeValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Outstanding balance</p>
          <p className={`text-sm font-semibold ${outstanding > 0 ? "text-orange-600" : "text-slate-700"}`}>
            ${outstanding.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Communication Preferences */}
      <div className="bg-white rounded-xl shadow-sm border-0 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5" /> Communication preferences
        </h3>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">Notifications enabled</span>
            <button
              onClick={() => togglePref("notifications_enabled")}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${customer.notifications_enabled !== false ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
            >
              {customer.notifications_enabled !== false ? "Yes" : "No"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 flex items-center gap-1"><MessageSquare className="w-3 h-3" />SMS consent</span>
            <button
              onClick={() => togglePref("sms_consent")}
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${customer.sms_consent ? "bg-green-100 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}
            >
              {customer.sms_consent ? "Opted-in" : "Opted-out"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">Marketing consent</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${customer.marketing_consent ? "bg-green-100 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                {customer.marketing_consent ? "Opted-in" : "Opted-out"}
              </span>
              {!customer.marketing_consent && (
                <button onClick={() => togglePref("marketing_consent")} className="text-xs text-blue-600 hover:underline">Opt-in</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-xl shadow-sm border-0 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Customer tags
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(customer.tags || []).map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTag()}
            placeholder="Add tag..."
            className="text-xs h-7 flex-1"
          />
          <Button size="sm" variant="outline" onClick={addTag} className="h-7 px-2"><Plus className="w-3 h-3" /></Button>
        </div>
      </div>
    </div>
  );
}