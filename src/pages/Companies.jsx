import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Plus, Pencil, Trash2, Building2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
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
  website: "", is_active: true
};

export default function Companies() {
  const { refreshCompanies } = useApp();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    const list = await base44.entities.Company.list();
    setCompanies(list);
    setLoading(false);
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
    if (editing) {
      await base44.entities.Company.update(editing.id, form);
    } else {
      await base44.entities.Company.create(form);
    }
    setSaving(false);
    setDialogOpen(false);
    await loadCompanies();
    refreshCompanies();
  }

  async function handleDelete() {
    await base44.entities.Company.delete(deleteTarget.id);
    setDeleteTarget(null);
    await loadCompanies();
    refreshCompanies();
  }

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage all Parrow Enterprises subsidiaries</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Company
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No companies yet</p>
            <p className="text-slate-400 text-sm mt-1">Add your first subsidiary to get started</p>
            <Button onClick={openCreate} className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Add Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {companies.map(company => (
            <Card key={company.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm"
                      style={{ backgroundColor: company.primary_color || "#3b82f6" }}
                    >
                      {company.name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{company.name}</h3>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{company.industry}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={company.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {company.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  {company.email && (
                    <p className="text-xs text-slate-500">{company.email}</p>
                  )}
                  {company.phone && (
                    <p className="text-xs text-slate-500">{company.phone}</p>
                  )}
                  {company.city && (
                    <p className="text-xs text-slate-500">{company.city}, {company.state}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-1"
                    onClick={() => openEdit(company)}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-200"
                    onClick={() => setDeleteTarget(company)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Honeydo Crew"
                />
              </div>
              <div>
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={v => setForm({ ...form, industry: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.is_active ? "active" : "inactive"}
                  onValueChange={v => setForm({ ...form, is_active: v === "active" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@company.com" />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2} placeholder="FL" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://" />
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
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}