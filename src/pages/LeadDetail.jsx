import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import LeadSidebar from "@/components/leads/LeadSidebar";
import LeadActivity from "@/components/leads/LeadActivity";

const STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  { value: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  { value: "won", label: "Won", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
];

const SOURCES = ["website", "referral", "google", "facebook", "instagram", "yelp", "door_hanger", "postcard", "other"];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeCompany } = useApp();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const loadData = useCallback(async () => {
    if (!id) return;
    const [leads, acts] = await Promise.all([
      base44.entities.Lead.filter({ id }),
      base44.entities.Activity.filter({ related_to_id: id }),
    ]);
    if (leads.length > 0) {
      setLead(leads[0]);
      setEditForm(leads[0]);
    }
    setActivities(acts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleUpdate(data) {
    await base44.entities.Lead.update(id, data);
    setLead(prev => ({ ...prev, ...data }));
  }

  async function handleSaveEdit() {
    await base44.entities.Lead.update(id, editForm);
    setLead(editForm);
    setEditing(false);
  }

  async function handleConvert() {
    setConverting(true);
    await base44.entities.Customer.create({
      company_id: lead.company_id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      source: lead.source,
      status: "active",
    });
    await base44.entities.Lead.update(id, { status: "won" });
    setLead(prev => ({ ...prev, status: "won" }));
    setConverting(false);
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!lead) return (
    <div className="p-6 text-center text-slate-500">Lead not found.</div>
  );

  const stage = STAGES.find(s => s.value === lead.status) || STAGES[0];

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("Leads"))} className="gap-1 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Leads
        </Button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
            {lead.first_name?.[0]}{lead.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{lead.first_name} {lead.last_name}</h1>
            <Badge className={`text-xs mt-0.5 ${stage.color}`}>{stage.label}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="gap-1 text-xs">
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1 text-xs" onClick={handleSaveEdit}>
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1 text-xs">
              <Edit2 className="w-3.5 h-3.5" /> Edit Lead
            </Button>
          )}
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
          <LeadSidebar lead={lead} onUpdate={handleUpdate} onConvert={handleConvert} converting={converting} />
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile sidebar */}
          <div className="lg:hidden">
            <LeadSidebar lead={lead} onUpdate={handleUpdate} onConvert={handleConvert} converting={converting} />
          </div>

          {/* Lead details card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Lead Details</h3>
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Stage</Label>
                      <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Source</Label>
                      <Select value={editForm.source} onValueChange={v => setEditForm(f => ({ ...f, source: v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Service Interest</Label>
                      <Input value={editForm.service_interest || ""} onChange={e => setEditForm(f => ({ ...f, service_interest: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Lawn Care" />
                    </div>
                    <div>
                      <Label className="text-xs">Estimated Value ($)</Label>
                      <Input type="number" value={editForm.estimated_value || ""} onChange={e => setEditForm(f => ({ ...f, estimated_value: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Follow Up Date</Label>
                    <Input type="date" value={editForm.follow_up_date || ""} onChange={e => setEditForm(f => ({ ...f, follow_up_date: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {lead.service_interest && (
                    <div>
                      <p className="text-xs text-slate-400">Service interest</p>
                      <p className="text-sm text-slate-800">{lead.service_interest}</p>
                    </div>
                  )}
                  {lead.estimated_value > 0 && (
                    <div>
                      <p className="text-xs text-slate-400">Estimated value</p>
                      <p className="text-sm font-semibold text-emerald-600">${lead.estimated_value.toLocaleString()}</p>
                    </div>
                  )}
                  {lead.follow_up_date && (
                    <div>
                      <p className="text-xs text-slate-400">Follow up</p>
                      <p className="text-sm text-slate-800">{lead.follow_up_date}</p>
                    </div>
                  )}
                  {lead.source && (
                    <div>
                      <p className="text-xs text-slate-400">Source</p>
                      <p className="text-sm text-slate-800 capitalize">{lead.source.replace("_", " ")}</p>
                    </div>
                  )}
                  {lead.notes && (
                    <div className="col-span-full">
                      <p className="text-xs text-slate-400">Notes</p>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                  )}
                  {!lead.service_interest && !lead.estimated_value && !lead.follow_up_date && !lead.source && !lead.notes && (
                    <p className="text-sm text-slate-400 col-span-full">No details added yet. Click Edit Lead to add information.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <LeadActivity
            leadId={id}
            companyId={lead.company_id}
            activities={activities}
            onActivityAdded={loadData}
          />
        </div>
      </div>
    </div>
  );
}