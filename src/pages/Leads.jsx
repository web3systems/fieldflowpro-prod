import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  Plus, Search, UserPlus, Phone, Mail,
  ChevronRight, Trash2, Code2
} from "lucide-react";
import EmbedCodeModal from "../components/leads/EmbedCodeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  { value: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  { value: "won", label: "Won", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
];

const SOURCES = ["website", "referral", "google", "facebook", "instagram", "yelp", "door_hanger", "postcard", "other"];

const defaultForm = {
  first_name: "", last_name: "", email: "", phone: "",
  address: "", source: "website", service_interest: "",
  status: "new", notes: "", estimated_value: "", follow_up_date: ""
};

export default function Leads() {
  const { activeCompany } = useApp();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [embedOpen, setEmbedOpen] = useState(false);

  useEffect(() => {
    if (activeCompany) loadLeads();
  }, [activeCompany]);

  async function loadLeads() {
    setLoading(true);
    const list = await base44.entities.Lead.filter({ company_id: activeCompany.id });
    setLeads(list);
    setLoading(false);
  }

  function openCreate() {
    setForm(defaultForm);
    setSheetOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const data = {
      ...form,
      company_id: activeCompany.id,
      estimated_value: parseFloat(form.estimated_value) || 0
    };
    const created = await base44.entities.Lead.create(data);
    setSaving(false);
    setSheetOpen(false);
    navigate(createPageUrl(`LeadDetail/${created.id}`));
  }

  async function handleDelete() {
    await base44.entities.Lead.delete(deleteTarget.id);
    setDeleteTarget(null);
    await loadLeads();
  }

  const filtered = leads.filter(l => {
    const name = `${l.first_name} ${l.last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || l.email?.includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStage = (status) => STAGES.find(s => s.value === status) || STAGES[0];
  const totalValue = filtered.reduce((s, l) => s + (l.estimated_value || 0), 0);

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lead Pipeline</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {filtered.length} leads · <span className="text-emerald-600 font-medium">${totalValue.toLocaleString()} estimated</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEmbedOpen(true)} className="gap-2">
            <Code2 className="w-4 h-4" /> Get Embed Code
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Pipeline stages summary */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {STAGES.map(stage => {
          const count = leads.filter(l => l.status === stage.value).length;
          return (
            <button
              key={stage.value}
              onClick={() => setFilterStatus(filterStatus === stage.value ? "all" : stage.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                filterStatus === stage.value
                  ? `${stage.color} border-current shadow-sm`
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
              {stage.label}
              <span className="bg-white/50 px-1.5 py-0.5 rounded-full">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9 bg-white" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No leads found</p>
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Add Lead</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => {
            const stage = getStage(lead.status);
            return (
              <Card key={lead.id} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => openEdit(lead)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-10 rounded-full flex-shrink-0 ${stage.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800">{lead.first_name} {lead.last_name}</h3>
                        <Badge className={`text-xs ${stage.color}`}>{stage.label}</Badge>
                        {lead.source && (
                          <Badge className="text-xs bg-slate-100 text-slate-600 capitalize">{lead.source.replace("_", " ")}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {lead.phone && <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"><Phone className="w-3 h-3" />{lead.phone}</a>}
                        {lead.email && <span className="flex items-center gap-1 text-xs text-slate-500"><Mail className="w-3 h-3" />{lead.email}</span>}
                        {lead.service_interest && <span className="text-xs text-slate-500">· {lead.service_interest}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lead.estimated_value > 0 && (
                        <span className="text-sm font-semibold text-emerald-600">${lead.estimated_value.toLocaleString()}</span>
                      )}
                      <button className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md" onClick={e => { e.stopPropagation(); setDeleteTarget(lead); }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? `${editing.first_name} ${editing.last_name}` : "New Lead"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
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
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stage</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service Interest</Label>
                <Input value={form.service_interest} onChange={e => setForm({ ...form, service_interest: e.target.value })} placeholder="e.g. Lawn Care" />
              </div>
              <div>
                <Label>Est. Value ($)</Label>
                <Input type="number" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Follow Up Date</Label>
              <Input type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>

            {editing && editing.status !== "won" && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium mb-2">Ready to convert this lead?</p>
                <Button
                  onClick={() => convertToCustomer(editing)}
                  className="w-full bg-green-600 hover:bg-green-700 gap-2"
                  size="sm"
                >
                  <ArrowRight className="w-4 h-4" /> Convert to Customer
                </Button>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.first_name} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Lead"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <EmbedCodeModal open={embedOpen} onClose={() => setEmbedOpen(false)} company={activeCompany} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this lead.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}