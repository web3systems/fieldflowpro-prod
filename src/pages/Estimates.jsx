import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  Plus, FileText, Search, Trash2, ChevronRight,
  CheckCircle, XCircle, Briefcase, Download, Copy
} from "lucide-react";
import { downloadEstimatePdf } from "../components/documents/generatePdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { format } from "date-fns";
import ServicePicker from "@/components/services/ServicePicker";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

const defaultItem = { description: "", quantity: 1, unit_price: 0, total: 0 };
const defaultForm = {
  title: "", customer_id: "", status: "draft",
  line_items: [{ ...defaultItem }], subtotal: 0, tax_rate: 0,
  tax_amount: 0, discount: 0, total: 0,
  notes: "", valid_until: ""
};

export default function Estimates() {
  const navigate = useNavigate();
  const { activeCompany } = useApp();
  const [estimates, setEstimates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  useEffect(() => {
    if (activeCompany && customers.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const customerId = params.get("customer_id");
      if (customerId) {
        const num = `EST-${String(estimates.length + 1).padStart(4, "0")}`;
        const tax_rate = activeCompany?.default_tax_rate || 0;
        setEditing(null);
        setForm({ ...defaultForm, estimate_number: num, customer_id: customerId, line_items: [{ ...defaultItem }], tax_rate });
        setSheetOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [activeCompany, customers]);

  async function loadData() {
    setLoading(true);
    const [e, c] = await Promise.all([
      base44.entities.Estimate.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
    ]);
    setEstimates(e);
    setCustomers(c);
    setLoading(false);
  }

  function updateItem(index, field, value) {
    const items = [...form.line_items];
    items[index] = { ...items[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
    }
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total });
  }

  function addItem() {
    setForm({ ...form, line_items: [...form.line_items, { ...defaultItem }] });
  }

  function addServiceAsItem(service) {
    const items = [...form.line_items];
    // If last item is empty, replace it; otherwise append
    const last = items[items.length - 1];
    if (last && !last.description && !last.unit_price) {
      items[items.length - 1] = service;
    } else {
      items.push(service);
    }
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total });
  }

  function removeItem(index) {
    const items = form.line_items.filter((_, i) => i !== index);
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm({ ...form, line_items: items, subtotal, tax_amount, total });
  }

  function openCreate() {
    setEditing(null);
    const num = `EST-${String(estimates.length + 1).padStart(4, "0")}`;
    const tax_rate = activeCompany?.default_tax_rate || 0;
    setForm({ ...defaultForm, estimate_number: num, line_items: [{ ...defaultItem }], tax_rate });
    setSheetOpen(true);
  }

  function openEdit(est) {
    navigate(`/EstimateDetail/${est.id}`);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id };
    if (editing) {
      await base44.entities.Estimate.update(editing.id, data);
    } else {
      await base44.entities.Estimate.create(data);
    }
    setSaving(false);
    setSheetOpen(false);
    await loadData();
  }

  async function handleApprove() {
    setApproving(true);
    // Mark estimate as approved
    await base44.entities.Estimate.update(editing.id, { status: "approved" });
    // Create a job from this estimate
    const job = await base44.entities.Job.create({
      company_id: activeCompany.id,
      customer_id: form.customer_id,
      estimate_id: editing.id,
      title: form.title,
      description: form.notes || "",
      status: "new",
      total_amount: form.total,
      service_type: "",
    });
    setApproving(false);
    setSheetOpen(false);
    await loadData();
    // Navigate to the jobs page
    window.location.href = createPageUrl("Jobs");
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const num = `EST-${String(estimates.length + 2).padStart(4, "0")}`;
    const { id, created_date, updated_date, ...rest } = editing;
    await base44.entities.Estimate.create({ ...rest, ...form, estimate_number: num, status: "draft" });
    setDuplicating(false);
    setSheetOpen(false);
    await loadData();
  }

  function handleDownloadPdf() {
    const customer = customers.find(c => c.id === form.customer_id);
    downloadEstimatePdf({ ...form, id: editing?.id }, customer, activeCompany);
  }

  function handleExportCsv() {
    const rows = [["Estimate #", "Title", "Customer", "Status", "Total", "Valid Until"]];
    estimates.forEach(e => {
      rows.push([
        e.estimate_number || "",
        e.title || "",
        getCustomerName(e.customer_id),
        e.status || "",
        (e.total || 0).toFixed(2),
        e.valid_until || "",
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "estimates.csv"; a.click();
  }

  async function handleDecline() {
    await base44.entities.Estimate.update(editing.id, { status: "declined" });
    setSheetOpen(false);
    await loadData();
  }

  const filtered = estimates.filter(e =>
    !search || e.title?.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerName = (id) => {
    const c = customers.find(c => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estimates</h1>
          <p className="text-slate-500 text-sm mt-0.5">{estimates.length} estimates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2 hidden sm:flex">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Estimate
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search estimates..." className="pl-9 bg-white" />
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No estimates yet</p>
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Create Estimate</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(est => (
            <Card key={est.id} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => openEdit(est)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-slate-900">{getCustomerName(est.customer_id)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{est.estimate_number}</span>
                      <span className="text-sm text-slate-600">{est.title}</span>
                      <Badge className={`text-xs capitalize ${STATUS_STYLES[est.status] || "bg-gray-100 text-gray-600"}`}>
                        {est.status}
                      </Badge>
                      {est.valid_until && (
                        <span className="text-xs text-slate-400">Valid until {format(new Date(est.valid_until), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-base font-bold text-slate-800">${(est.total || 0).toLocaleString()}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Estimate" : "New Estimate"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lawn Maintenance" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(STATUS_STYLES).map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <div className="flex items-center gap-2">
                  <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} />
                  <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Line
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {form.line_items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-5">
                      <Input
                        value={item.description}
                        onChange={e => updateItem(idx, "description", e.target.value)}
                        placeholder="Description"
                        className="bg-white text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        className="bg-white text-sm text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        className="bg-white text-sm"
                      />
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium text-slate-700">
                      ${(item.total || 0).toFixed(2)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">${(form.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Tax Rate (%)</span>
                  <Input
                    type="number"
                    value={form.tax_rate}
                    onChange={e => {
                      const tax_rate = parseFloat(e.target.value) || 0;
                      const tax_amount = form.subtotal * (tax_rate / 100);
                      const total = form.subtotal + tax_amount - (form.discount || 0);
                      setForm({ ...form, tax_rate, tax_amount, total });
                    }}
                    className="w-20 h-7 text-sm bg-white"
                  />
                  <span className="text-sm text-slate-500 ml-auto">${(form.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span>${(form.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Notes visible to customer..." />
            </div>

            <div className="flex gap-3 pt-2 flex-col">
              {editing && !["approved", "declined"].includes(form.status) && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleDecline}
                    variant="outline"
                    className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" /> Decline
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={approving}
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {approving ? "Creating Job..." : "Approve & Create Job"}
                  </Button>
                </div>
              )}
              {editing && form.status === "approved" && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                  <Briefcase className="w-4 h-4" />
                  This estimate has been approved — a job was created.
                </div>
              )}
              {editing && form.status === "declined" && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-sm">
                  <XCircle className="w-4 h-4" />
                  This estimate was declined.
                </div>
              )}
              {editing && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadPdf} className="flex-1 gap-1.5">
                    <Download className="w-4 h-4" /> PDF
                  </Button>
                  <Button variant="outline" onClick={handleDuplicate} disabled={duplicating} className="flex-1 gap-1.5">
                    <Copy className="w-4 h-4" /> {duplicating ? "Duplicating..." : "Duplicate"}
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.title} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Estimate"}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>

      </Sheet>
    </div>
  );
}