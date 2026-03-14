import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Edit2, Check, X, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "Contacted", color: "bg-indigo-100 text-indigo-700" },
  { value: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-700" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-amber-100 text-amber-700" },
  { value: "won", label: "Won", color: "bg-green-100 text-green-700" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700" },
];

export default function LeadSidebar({ lead, onUpdate, onConvert, converting }) {
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({});

  const stage = STAGES.find(s => s.value === lead.status) || STAGES[0];

  function startEdit() {
    setContactForm({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email || "",
      phone: lead.phone || "",
      address: lead.address || "",
    });
    setEditingContact(true);
  }

  async function saveContact() {
    await onUpdate(contactForm);
    setEditingContact(false);
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border-0 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Lead Summary</h3>
        <div>
          <p className="text-xs text-slate-400">Stage</p>
          <Badge className={`text-xs mt-0.5 ${stage.color}`}>{stage.label}</Badge>
        </div>
        {lead.estimated_value > 0 && (
          <div>
            <p className="text-xs text-blue-500 font-medium">Estimated value</p>
            <p className="text-sm font-semibold text-slate-800">${lead.estimated_value.toLocaleString()}</p>
          </div>
        )}
        {lead.service_interest && (
          <div>
            <p className="text-xs text-slate-400">Service interest</p>
            <p className="text-sm text-slate-700">{lead.service_interest}</p>
          </div>
        )}
        {lead.source && (
          <div>
            <p className="text-xs text-slate-400">Source</p>
            <p className="text-sm text-slate-700 capitalize">{lead.source.replace("_", " ")}</p>
          </div>
        )}
        {lead.follow_up_date && (
          <div>
            <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Follow-up</p>
            <p className="text-sm text-slate-700">{format(new Date(lead.follow_up_date), "MMM d, yyyy")}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-400">Created</p>
          <p className="text-sm text-slate-700">{lead.created_date ? format(new Date(lead.created_date), "MM/dd/yyyy") : "—"}</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-xl shadow-sm border-0 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Contact info</h3>
          {!editingContact && (
            <button onClick={startEdit} className="p-1 text-slate-400 hover:text-slate-700">
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
            <div className="flex gap-2">
              <Button size="sm" onClick={saveContact} className="flex-1 h-7 bg-blue-600 hover:bg-blue-700 text-xs">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingContact(false)} className="flex-1 h-7 text-xs">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-400">Name</p>
              <p className="text-sm text-slate-800 font-medium">{lead.first_name} {lead.last_name}</p>
            </div>
            {lead.phone && (
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                <a href={`tel:${lead.phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" />{lead.phone}
                </a>
              </div>
            )}
            {lead.email && (
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all">
                  <Mail className="w-3 h-3" />{lead.email}
                </a>
              </div>
            )}
            {lead.address && (
              <div>
                <p className="text-xs text-slate-400">Address</p>
                <p className="text-sm text-slate-700 flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />{lead.address}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Convert */}
      {lead.status !== "won" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800 mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Ready to convert?
          </p>
          <p className="text-xs text-green-600 mb-3">Turn this lead into a full customer record.</p>
          <Button
            onClick={onConvert}
            disabled={converting}
            className="w-full bg-green-600 hover:bg-green-700 gap-2 text-sm"
            size="sm"
          >
            <ArrowRight className="w-4 h-4" /> {converting ? "Converting..." : "Convert to Customer"}
          </Button>
        </div>
      )}
    </div>
  );
}