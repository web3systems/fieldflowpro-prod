import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Download, Copy, CheckCircle, XCircle, Briefcase,
  Trash2, Plus, Save, User, Calendar, DollarSign, FileText, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import ServicePicker from "@/components/services/ServicePicker";
import { downloadEstimatePdf } from "../components/documents/generatePdf";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

const defaultItem = { description: "", quantity: 1, unit_price: 0, total: 0 };

export default function EstimateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeCompany } = useApp();

  const [estimate, setEstimate] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [form, setForm] = useState(null);
  const [editingInfo, setEditingInfo] = useState(false);

  const loadData = useCallback(async () => {
    const [ests, c] = await Promise.all([
      base44.entities.Estimate.filter({ id }),
      activeCompany ? base44.entities.Customer.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
    ]);
    if (ests.length > 0) {
      setEstimate(ests[0]);
      setForm({ ...ests[0] });
    }
    setCustomers(c);
    setLoading(false);
  }, [id, activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateItem(index, field, value) {
    const items = [...form.line_items];
    items[index] = { ...items[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
    }
    recalc(items);
  }

  function recalc(items) {
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((form.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (form.discount || 0);
    setForm(f => ({ ...f, line_items: items, subtotal, tax_amount, total }));
  }

  function addItem() {
    setForm(f => ({ ...f, line_items: [...f.line_items, { ...defaultItem }] }));
  }

  function addServiceAsItem(service) {
    const items = [...form.line_items];
    const last = items[items.length - 1];
    if (last && !last.description && !last.unit_price) items[items.length - 1] = service;
    else items.push(service);
    recalc(items);
  }

  function removeItem(index) {
    const items = form.line_items.filter((_, i) => i !== index);
    recalc(items);
  }

  async function handleSave() {
    setSaving(true);
    await base44.entities.Estimate.update(id, form);
    setEstimate({ ...estimate, ...form });
    setSaving(false);
    setEditingInfo(false);
  }

  async function handleApprove() {
    setApproving(true);
    await base44.entities.Estimate.update(id, { status: "approved" });
    await base44.entities.Job.create({
      company_id: activeCompany.id,
      customer_id: form.customer_id,
      estimate_id: id,
      title: form.title,
      description: form.notes || "",
      status: "new",
      total_amount: form.total,
      service_type: "",
    });
    setApproving(false);
    navigate(createPageUrl("Jobs"));
  }

  async function handleDecline() {
    await base44.entities.Estimate.update(id, { status: "declined" });
    setEstimate(e => ({ ...e, status: "declined" }));
    setForm(f => ({ ...f, status: "declined" }));
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const allEsts = await base44.entities.Estimate.filter({ company_id: activeCompany.id });
    const num = `EST-${String(allEsts.length + 1).padStart(4, "0")}`;
    const { id: _id, created_date, updated_date, ...rest } = estimate;
    await base44.entities.Estimate.create({ ...rest, ...form, estimate_number: num, status: "draft" });
    setDuplicating(false);
    navigate(createPageUrl("Estimates"));
  }

  function handleDownloadPdf() {
    const customer = customers.find(c => c.id === form.customer_id);
    downloadEstimatePdf({ ...form, id }, customer, activeCompany);
  }

  const getCustomerName = (cid) => {
    const c = customers.find(c => c.id === cid);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!estimate || !form) return (
    <div className="p-6 text-center text-slate-500">Estimate not found.</div>
  );

  const canAct = !["approved", "declined"].includes(form.status);

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("Estimates"))} className="gap-1 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Estimates
        </Button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{form.title}</h1>
              {form.estimate_number && <span className="text-sm font-mono text-slate-400">{form.estimate_number}</span>}
            </div>
            <Badge className={`text-xs mt-0.5 ${STATUS_STYLES[form.status] || "bg-gray-100 text-gray-600"}`}>{form.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} className="gap-1 text-xs hidden sm:flex">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={duplicating} className="gap-1 text-xs hidden sm:flex">
            <Copy className="w-3.5 h-3.5" /> {duplicating ? "..." : "Duplicate"}
          </Button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</p>
                <button onClick={() => setEditingInfo(!editingInfo)} className="text-slate-400 hover:text-blue-600">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {editingInfo ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Customer</Label>
                    <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.keys(STATUS_STYLES).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Valid Until</Label>
                    <Input type="date" value={form.valid_until || ""} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="w-full gap-1 bg-blue-600 hover:bg-blue-700">
                    <Save className="w-3 h-3" />{saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-700">{getCustomerName(form.customer_id)}</span>
                  </div>
                  {form.valid_until && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600">Valid until {format(new Date(form.valid_until), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-900 font-semibold">${(form.total || 0).toLocaleString()}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Actions</p>
              {canAct && (
                <>
                  <Button onClick={handleDecline} variant="outline" className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50">
                    <XCircle className="w-4 h-4" /> Decline
                  </Button>
                  <Button onClick={handleApprove} disabled={approving} className="w-full gap-2 bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" />
                    {approving ? "Creating Job..." : "Approve & Create Job"}
                  </Button>
                </>
              )}
              {form.status === "approved" && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                  <Briefcase className="w-4 h-4" /> Approved — job created.
                </div>
              )}
              {form.status === "declined" && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-sm">
                  <XCircle className="w-4 h-4" /> Estimate declined.
                </div>
              )}
              <Button variant="outline" onClick={handleDownloadPdf} className="w-full gap-2 lg:hidden">
                <Download className="w-4 h-4" /> Download PDF
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile sidebar */}
          <div className="lg:hidden space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm"><User className="w-3.5 h-3.5 text-slate-400" /><span>{getCustomerName(form.customer_id)}</span></div>
                <div className="flex items-center gap-2 text-sm"><DollarSign className="w-3.5 h-3.5 text-slate-400" /><span className="font-semibold">${(form.total || 0).toLocaleString()}</span></div>
              </CardContent>
            </Card>
            {canAct && (
              <div className="flex gap-2">
                <Button onClick={handleDecline} variant="outline" className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50"><XCircle className="w-4 h-4" /> Decline</Button>
                <Button onClick={handleApprove} disabled={approving} className="flex-1 gap-2 bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4" />{approving ? "..." : "Approve"}</Button>
              </div>
            )}
          </div>

          {/* Line Items */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <div className="flex items-center gap-2">
                  <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} />
                  <Button variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="w-3 h-3" /> Add Line</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {form.line_items?.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg">
                  <div className="col-span-5">
                    <Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Description" className="bg-white text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qty" className="bg-white text-sm text-center" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} placeholder="Price" className="bg-white text-sm" />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-slate-700">${(item.total || 0).toFixed(2)}</div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}

              <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">${(form.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Tax Rate (%)</span>
                  <Input type="number" value={form.tax_rate} onChange={e => {
                    const tax_rate = parseFloat(e.target.value) || 0;
                    const tax_amount = form.subtotal * (tax_rate / 100);
                    const total = form.subtotal + tax_amount - (form.discount || 0);
                    setForm(f => ({ ...f, tax_rate, tax_amount, total }));
                  }} className="w-20 h-7 text-sm bg-white" />
                  <span className="text-sm text-slate-500 ml-auto">${(form.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span>${(form.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Notes visible to customer..." />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}