import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Users, Phone, Mail, MapPin,
  Briefcase, DollarSign, Download, ExternalLink, X, ArrowUp, ArrowDown, FileText, Trash2, ChevronRight
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
  const [sortField, setSortField] = useState("first_name");
  const [sortDir, setSortDir] = useState("asc");
  const [jobCounts, setJobCounts] = useState({});

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
    const [list, jobs] = await Promise.all([
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Job.filter({ company_id: activeCompany.id }),
    ]);
    setCustomers(list);
    const counts = {};
    jobs.forEach(j => { counts[j.customer_id] = (counts[j.customer_id] || 0) + 1; });
    setJobCounts(counts);
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
    const name = `${c.business_name || ""} ${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || c.email?.includes(search.toLowerCase()) || c.phone?.includes(search);
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (sortField === "job_count") {
      const diff = (jobCounts[b.id] || 0) - (jobCounts[a.id] || 0);
      return sortDir === "asc" ? -diff : diff;
    }
    if (sortField === "created_date") {
      const diff = new Date(b.created_date) - new Date(a.created_date);
      return sortDir === "asc" ? -diff : diff;
    }
    let va = a[sortField] || "", vb = b[sortField] || "";
    if (sortField === "total_revenue") { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
    if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const statusStyle = {
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-gray-100 text-gray-600 border-gray-200",
    lead: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const AVATAR_COLORS = [
    "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-orange-500",
    "bg-teal-500", "bg-pink-500",
  ];

  function getAvatarColor(name = "") {
    const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  }

  function getInitials(customer) {
    if (customer.business_name) return customer.business_name.slice(0, 2).toUpperCase();
    const f = customer.first_name?.[0] || "";
    const l = customer.last_name?.[0] || "";
    return (f + l).toUpperCase() || "?";
  }

  function getDisplayName(customer) {
    return customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "—";
  }

  function getAddress(customer) {
    return [customer.address, customer.city, customer.state].filter(Boolean).join(", ");
  }

  return (
    <div className="relative min-h-full p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} {filtered.length === 1 ? "customer" : "customers"}</p>
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

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or phone..." className="pl-9 bg-white" />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={setSortField}>
            <SelectTrigger className="w-40 bg-white">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first_name">Name A–Z</SelectItem>
              <SelectItem value="created_date">Most Recent</SelectItem>
              <SelectItem value="job_count">Most Jobs</SelectItem>
              <SelectItem value="total_revenue">Revenue</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex-shrink-0"
            title={sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Grid / Empty / Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-52 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-700 font-semibold text-lg mb-1">
            {customers.length === 0 ? "No customers yet" : "No customers found"}
          </p>
          <p className="text-slate-400 text-sm mb-6">
            {customers.length === 0 ? "Add your first customer to get started." : "Try adjusting your search or filters."}
          </p>
          {customers.length === 0 && (
            <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(customer => {
            const displayName = getDisplayName(customer);
            const initials = getInitials(customer);
            const avatarColor = getAvatarColor(displayName);
            const address = getAddress(customer);
            const jobCount = jobCounts[customer.id] || 0;
            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all flex flex-col"
              >
                {/* Card top */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${avatarColor}`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 leading-tight truncate">{displayName}</p>
                        {customer.business_name && (customer.first_name || customer.last_name) && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {`${customer.first_name || ""} ${customer.last_name || ""}`.trim()}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Job count + status badges */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {jobCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          <Briefcase className="w-3 h-3" />{jobCount} {jobCount === 1 ? "Job" : "Jobs"}
                        </span>
                      )}
                      {customer.status && (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyle[customer.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {customer.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1.5">
                    {customer.phone && (
                      <a
                        href={`tel:${customer.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{customer.phone}</span>
                      </a>
                    )}
                    {customer.email && (
                      <a
                        href={`mailto:${customer.email}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </a>
                    )}
                    {address && (
                      <div className="flex items-start gap-2 text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{address}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {customer.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {customer.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700 border border-violet-100">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Revenue */}
                  {customer.total_revenue > 0 && (
                    <p className="mt-3 text-sm font-semibold text-emerald-600">${customer.total_revenue.toLocaleString()} lifetime</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="px-5 pb-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/CustomerDetail/${customer.id}`)}
                    className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => navigate(`/NewJob?customer_id=${customer.id}`)}
                    className="flex-1 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                  >
                    New Job
                  </button>
                  {customer.phone && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="h-10 w-10 rounded-lg bg-slate-100 hover:bg-green-100 hover:text-green-700 text-slate-500 flex items-center justify-center transition-colors flex-shrink-0"
                      title={`Call ${customer.phone}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(customer); }}
                    className="h-10 w-10 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 flex items-center justify-center transition-colors flex-shrink-0"
                    title="Delete customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Modal */}
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10 rounded-t-2xl">
            <h2 className="text-xl font-semibold">{editing ? `${editing.first_name} ${editing.last_name}` : "Add new customer"}</h2>
            <button onClick={() => setSheetOpen(false)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-6 p-4 pb-10">

            {/* Quick actions for existing customers */}
            {editing && (
              <div className="flex gap-2 p-3 bg-slate-50 rounded-xl">
                <button onClick={() => { setSheetOpen(false); navigate(`/NewEstimate?customer_id=${editing.id}`); }} className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white shadow-sm">
                  <FileText className="w-4 h-4" /><span className="text-xs font-medium">New Estimate</span>
                </button>
                <button onClick={() => { setSheetOpen(false); navigate(`/NewJob?customer_id=${editing.id}`); }} className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors text-white shadow-sm">
                  <Briefcase className="w-4 h-4" /><span className="text-xs font-medium">New Job</span>
                </button>
                <button onClick={() => { setSheetOpen(false); navigate(`/NewInvoice?customer_id=${editing.id}`); }} className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 transition-colors text-white shadow-sm">
                  <DollarSign className="w-4 h-4" /><span className="text-xs font-medium">New Invoice</span>
                </button>
                {editing?.email && (
                  <button onClick={handleSendPortalInvite} disabled={sendingPortalInvite} className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-600 transition-colors text-white shadow-sm disabled:opacity-60">
                    <ExternalLink className="w-4 h-4" /><span className="text-xs font-medium">{sendingPortalInvite ? "Sending..." : "Portal Invite"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Customer type toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, customer_type: "homeowner" })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.customer_type !== "business" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
              >
                Homeowner
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, customer_type: "business" })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.customer_type === "business" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
              >
                Business
              </button>
            </div>

            {/* Name row */}
            {form.customer_type === "business" && (
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Business Name *</Label>
                <Input placeholder="Business name" value={form.business_name || ""} onChange={e => setForm({ ...form, business_name: e.target.value })} />
              </div>
            )}
            <div>
              {form.customer_type === "business" && (
                <Label className="text-xs text-slate-500 mb-1 block">Contact Person</Label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="First name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                <Input placeholder="Last name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
              </div>
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
              <div className="space-y-3">
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
                {form.address && form.city && (
                  <div className="rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center h-36 border border-slate-200">
                    <iframe
                      title="map"
                      className="w-full h-full"
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(`${form.address} ${form.city} ${form.state} ${form.zip}`)}&output=embed`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notes section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Notes</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t pt-4 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="notifications" checked={form.notifications_enabled} onCheckedChange={v => setForm({ ...form, notifications_enabled: !!v })} />
                  <label htmlFor="notifications" className="text-sm text-slate-600">Send notifications</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="marketing" checked={form.marketing_consent} onCheckedChange={v => setForm({ ...form, marketing_consent: !!v })} />
                  <label htmlFor="marketing" className="text-sm text-slate-600">Marketing opt-in</label>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || (form.customer_type === "business" ? !form.business_name : (!form.first_name || !form.last_name))} className="bg-blue-600 hover:bg-blue-700">
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create"}
                </Button>
              </div>
            </div>

          </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.business_name || `${deleteTarget?.first_name || ""} ${deleteTarget?.last_name || ""}`.trim() || "this customer"}?</AlertDialogTitle>
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