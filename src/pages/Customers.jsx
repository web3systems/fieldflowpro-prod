import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Users, Phone, Mail, MapPin,
  ChevronRight, Trash2, FileText, Briefcase, DollarSign, Download, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const SOURCE_OPTIONS = ["website", "referral", "google", "facebook", "instagram", "other", "manual"];

const defaultForm = {
  first_name: "", last_name: "", email: "", phone: "",
  address: "", city: "", state: "", zip: "",
  source: "manual", status: "active", notes: ""
};

export default function Customers() {
  const { activeCompany } = useApp();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sendingPortalInvite, setSendingPortalInvite] = useState(false);

  function handleExportCsv() {
    const rows = [["First Name", "Last Name", "Email", "Phone", "Address", "City", "State", "Status", "Source"]];
    customers.forEach(c => rows.push([c.first_name || "", c.last_name || "", c.email || "", c.phone || "", c.address || "", c.city || "", c.state || "", c.status || "", c.source || ""]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = "customers.csv"; a.click();
  }

  async function handleSendPortalInvite() {
    if (!editing?.email) return;
    setSendingPortalInvite(true);
    const portalUrl = window.location.origin + "/CustomerPortal";
    await base44.functions.invoke("sendPortalInvite", { customer_id: editing.id, portal_url: portalUrl });
    setSendingPortalInvite(false);
    alert("Portal invite sent to " + editing.email);
  }

  useEffect(() => {
    if (activeCompany) loadCustomers();
  }, [activeCompany]);

  async function loadCustomers() {
    setLoading(true);
    const list = await base44.entities.Customer.filter({ company_id: activeCompany.id });
    setCustomers(list);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setSheetOpen(true);
  }

  function openEdit(customer) {
    setEditing(customer);
    setForm({ ...defaultForm, ...customer });
    setSheetOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id };
    if (editing) {
      await base44.entities.Customer.update(editing.id, data);
    } else {
      await base44.entities.Customer.create(data);
    }
    setSaving(false);
    setSheetOpen(false);
    await loadCustomers();
  }

  async function handleDelete() {
    await base44.entities.Customer.delete(deleteTarget.id);
    setDeleteTarget(null);
    await loadCustomers();
  }

  const filtered = customers.filter(c => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || c.email?.includes(search.toLowerCase()) || c.phone?.includes(search);
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusStyle = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    lead: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2 hidden sm:flex">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9 bg-white" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No customers found</p>
            <Button onClick={openCreate} className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Add Customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(customer => (
            <Card key={customer.id} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => openEdit(customer)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {customer.first_name?.[0]}{customer.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{customer.first_name} {customer.last_name}</h3>
                      <Badge className={`text-xs ${statusStyle[customer.status] || "bg-gray-100 text-gray-600"}`}>
                        {customer.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {customer.phone && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="w-3 h-3" />{customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Mail className="w-3 h-3" />{customer.email}
                        </span>
                      )}
                      {customer.city && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" />{customer.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {customer.total_revenue > 0 && (
                      <span className="text-sm font-semibold text-emerald-600">${customer.total_revenue.toLocaleString()}</span>
                    )}
                    <button
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(customer); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Customer Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? `${editing.first_name} ${editing.last_name}` : "New Customer"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
            {editing && (
              <div className="flex gap-2 p-3 bg-slate-50 rounded-xl">
                <button
                  onClick={() => { setSheetOpen(false); navigate(createPageUrl(`Estimates?customer_id=${editing.id}`)); }}
                  className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-medium">New Estimate</span>
                </button>
                <button
                  onClick={() => { setSheetOpen(false); navigate(createPageUrl(`Jobs?customer_id=${editing.id}`)); }}
                  className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors text-white shadow-sm"
                >
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs font-medium">New Job</span>
                </button>
                <button
                  onClick={() => { setSheetOpen(false); navigate(createPageUrl(`Invoices?customer_id=${editing.id}`)); }}
                  className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 transition-colors text-white shadow-sm"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">New Invoice</span>
                </button>
                {editing?.email && (
                  <button
                    onClick={handleSendPortalInvite}
                    disabled={sendingPortalInvite}
                    className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-600 transition-colors text-white shadow-sm disabled:opacity-60"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-xs font-medium">{sendingPortalInvite ? "Sending..." : "Portal Invite"}</span>
                  </button>
                )}
              </div>
            )}
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
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Customer notes..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.first_name || !form.last_name} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Customer"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.first_name} {deleteTarget?.last_name}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this customer and cannot be undone.</AlertDialogDescription>
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