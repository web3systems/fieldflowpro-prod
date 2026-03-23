import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Users, Phone, Mail, MapPin,
  ChevronRight, Trash2, FileText, Briefcase, DollarSign, Download, ExternalLink, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const SOURCE_OPTIONS = ["website", "referral", "google", "facebook", "instagram", "other", "manual"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const defaultForm = {
  first_name: "", last_name: "", email: "", phone: "",
  address: "", city: "", state: "", zip: "",
  source: "manual", status: "active", notes: "",
  customer_type: "homeowner", notifications_enabled: true, marketing_consent: false
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
    const customerId = deleteTarget.id;
    const [jobs, invoices, estimates] = await Promise.all([
      base44.entities.Job.filter({ customer_id: customerId }),
      base44.entities.Invoice.filter({ customer_id: customerId }),
      base44.entities.Estimate.filter({ customer_id: customerId }),
    ]);
    await Promise.all([
      ...jobs.map(j => base44.entities.Job.delete(j.id)),
      ...invoices.map(i => base44.entities.Invoice.delete(i.id)),
      ...estimates.map(e => base44.entities.Estimate.delete(e.id)),
      base44.entities.Customer.delete(customerId),
    ]);
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
    <div className="relative min-h-full p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-7xl mx-auto">
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
            <Card key={customer.id} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(`/CustomerDetail/${customer.id}`)}>
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
                        <a href={`tel:${customer.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                          <Phone className="w-3 h-3" />{customer.phone}
                        </a>
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

      {/* Customer Modal */}
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10 rounded-t-2xl">
            <h2 className="text-xl font-semibold">{editing ? `${editing.first_name} ${editing.last_name}` : "Add new customer"}</h2>
            <button onClick={() => setSheetOpen(false)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-6 p-4 pb-10">

            {/* Quick actions for existing customers */}
            {editing && (
              <div className="flex gap-2 p-3 bg-slate-50 rounded-xl">
                <button onClick={() => { setSheetOpen(false); navigate(createPageUrl(`Estimates?customer_id=${editing.id}`)); }} className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white shadow-sm">
                  <FileText className="w-4 h-4" /><span className="text-xs font-medium">New Estimate</span>
                </button>
                <button onClick={() => { setSheetOpen(false); navigate(createPageUrl(`Jobs?customer_id=${editing.id}`)); }} className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors text-white shadow-sm">
                  <Briefcase className="w-4 h-4" /><span className="text-xs font-medium">New Job</span>
                </button>
                <button onClick={() => { setSheetOpen(false); navigate(createPageUrl(`Invoices?customer_id=${editing.id}`)); }} className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 transition-colors text-white shadow-sm">
                  <DollarSign className="w-4 h-4" /><span className="text-xs font-medium">New Invoice</span>
                </button>
                {editing?.email && (
                  <button onClick={handleSendPortalInvite} disabled={sendingPortalInvite} className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-600 transition-colors text-white shadow-sm disabled:opacity-60">
                    <ExternalLink className="w-4 h-4" /><span className="text-xs font-medium">{sendingPortalInvite ? "Sending..." : "Portal Invite"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="First name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
              <Input placeholder="Last name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>

            {/* Display name / phone / role row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input placeholder="Display name (shown on invoices)" value={form.display_name || `${form.first_name} ${form.last_name}`.trim()} onChange={e => setForm({ ...form, display_name: e.target.value })} />
              <Input placeholder="Home phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="Role" value={form.role || ""} onChange={e => setForm({ ...form, role: e.target.value })} />
            </div>

            {/* Email / work phone / type row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <div className="space-y-2">
                <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <button type="button" onClick={() => {}} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Email
                </button>
              </div>
              <div className="space-y-2">
                <Input placeholder="Work phone" type="tel" value={form.work_phone || ""} onChange={e => setForm({ ...form, work_phone: e.target.value })} />
                <button type="button" onClick={() => {}} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="radio" id="homeowner" name="customer_type" checked={form.customer_type === "homeowner"} onChange={() => setForm({ ...form, customer_type: "homeowner" })} className="accent-blue-600" />
                  <label htmlFor="homeowner" className="text-sm">Homeowner</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" id="business" name="customer_type" checked={form.customer_type === "business"} onChange={() => setForm({ ...form, customer_type: "business" })} className="accent-blue-600" />
                  <label htmlFor="business" className="text-sm">Business</label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="do_not_service" checked={form.status === "inactive"} onCheckedChange={v => setForm({ ...form, status: v ? "inactive" : "active" })} />
                  <label htmlFor="do_not_service" className="text-sm">Mark as <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-medium">Do not service</span></label>
                </div>
                <p className="text-xs text-slate-400">Notifications will be turned off and it won't be possible to schedule a job or estimate.</p>
              </div>
            </div>

            {/* Address section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Address</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder="Street" className="col-span-2" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                    <Input placeholder="Unit" value={form.unit || ""} onChange={e => setForm({ ...form, unit: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                    <Select value={form.state} onValueChange={v => setForm({ ...form, state: v })}>
                      <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                      <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="Zip" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
                  </div>
                  <Input placeholder="Address Notes" value={form.address_notes || ""} onChange={e => setForm({ ...form, address_notes: e.target.value })} />
                  <button type="button" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Address
                  </button>
                </div>
                <div className="rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center h-36 border border-slate-200">
                  {form.address && form.city ? (
                    <iframe
                      title="map"
                      className="w-full h-full"
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(`${form.address} ${form.city} ${form.state} ${form.zip}`)}&output=embed`}
                    />
                  ) : (
                    <div className="text-center text-slate-400 text-xs p-3">
                      <MapPin className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      Enter address to see map
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Notes</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  <Input placeholder="Customer notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  <Input placeholder="Customer tags (press enter)" value={form.tags_input || ""} onChange={e => setForm({ ...form, tags_input: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <Input placeholder="This customer bills to" value={form.bills_to || ""} onChange={e => setForm({ ...form, bills_to: e.target.value })} />
                  <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue placeholder="Lead source" /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="notifications" checked={form.notifications_enabled} onCheckedChange={v => setForm({ ...form, notifications_enabled: !!v })} />
                  <label htmlFor="notifications" className="text-sm text-slate-600">Send notifications</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="marketing" checked={form.marketing_consent} onCheckedChange={v => setForm({ ...form, marketing_consent: !!v })} />
                  <label htmlFor="marketing" className="text-sm text-slate-600">Send marketing opt-in text</label>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.first_name || !form.last_name} className="bg-blue-600 hover:bg-blue-700">
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.first_name} {deleteTarget?.last_name}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this customer along with all their jobs, invoices, and estimates. This cannot be undone.</AlertDialogDescription>
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