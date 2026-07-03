import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Building2, ChevronDown, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const INDUSTRY_OPTIONS = [
  { value: "cleaning", label: "Cleaning" },
  { value: "landscaping", label: "Landscaping" },
  { value: "handyman", label: "Handyman" },
  { value: "painting", label: "Painting" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "other", label: "Other" },
];

const COLOR_OPTIONS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"
];

const defaultForm = {
  name: "", slug: "", industry: "other", primary_color: "#3b82f6",
  phone: "", email: "", address: "", city: "", state: "", zip: "",
  website: "", is_active: true, parent_company_id: null
};

export default function AdminCompanies() {
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedMasters, setExpandedMasters] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const list = await base44.entities.Company.list();
    setAllCompanies(list);
    setLoading(false);
  }

  // Master companies = no parent_company_id
  const masterCompanies = allCompanies.filter(c => !c.parent_company_id);
  const subsidiaryMap = allCompanies.reduce((acc, c) => {
    if (c.parent_company_id) {
      acc[c.parent_company_id] = acc[c.parent_company_id] || [];
      acc[c.parent_company_id].push(c);
    }
    return acc;
  }, {});

  const filteredMasters = masterCompanies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  function toggleExpand(id) {
    setExpandedMasters(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(company) {
    setEditing(company);
    setForm({ ...defaultForm, ...company });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = { ...form };
    if (!payload.parent_company_id) delete payload.parent_company_id;
    if (editing) {
      await base44.entities.Company.update(editing.id, payload);
    } else {
      await base44.entities.Company.create(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    await loadData();
  }

  async function handleDelete() {
    await base44.entities.Company.delete(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  }

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Companies</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {masterCompanies.length} master {masterCompanies.length === 1 ? "company" : "companies"} · {allCompanies.length - masterCompanies.length} subsidiaries
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-56"
          />
          <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700 flex-shrink-0">
            <Plus className="w-4 h-4" /> Add Company
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredMasters.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No companies found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMasters.map(master => {
            const subs = subsidiaryMap[master.id] || [];
            const isExpanded = expandedMasters[master.id];
            return (
              <div key={master.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Master row */}
                <div className="flex items-center gap-3 p-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                    style={{ backgroundColor: master.primary_color || "#3b82f6" }}
                  >
                    {master.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{master.name}</h3>
                      <Badge className={master.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} variant="secondary">
                        {master.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-slate-400 capitalize">{master.industry}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {[master.email, master.phone, master.city && `${master.city}, ${master.state}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {subs.length > 0 && (
                      <button
                        onClick={() => toggleExpand(master.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {subs.length} sub{subs.length !== 1 ? "s" : ""}
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openEdit(master)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:border-red-200"
                      onClick={() => setDeleteTarget(master)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Subsidiaries */}
                {isExpanded && subs.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
                    {subs.map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 px-4 py-3 pl-8">
                        <div className="w-1 h-8 bg-slate-300 rounded-full flex-shrink-0" />
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: sub.primary_color || "#3b82f6" }}
                        >
                          {sub.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 text-sm">{sub.name}</span>
                            <Badge className={sub.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} variant="secondary">
                              {sub.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-xs text-slate-400 capitalize">{sub.industry}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {[sub.email, sub.phone].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => openEdit(sub)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:border-red-200"
                            onClick={() => setDeleteTarget(sub)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Company" : "Add Company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Company Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Honeydo Crew" />
              </div>
              <div>
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={v => setForm({ ...form, industry: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.is_active ? "active" : "inactive"} onValueChange={v => setForm({ ...form, is_active: v === "active" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Parent Company (optional)</Label>
                <Select value={form.parent_company_id || "none"} onValueChange={v => setForm({ ...form, parent_company_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="None (master company)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (master company)</SelectItem>
                    {masterCompanies.filter(c => c.id !== editing?.id).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@company.com" />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2} placeholder="VT" />
              </div>
            </div>
            <div>
              <Label>Brand Color</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, primary_color: color })}
                    className={`w-8 h-8 rounded-full transition-transform ${form.primary_color === color ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : ""}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this company. This action cannot be undone.
            </AlertDialogDescription>
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