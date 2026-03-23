import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Download, Copy, CheckCircle, XCircle, Briefcase,
  Plus, Save, User, Calendar, DollarSign, FileText, Edit2, X, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import LineItemRow from "@/components/services/LineItemRow";
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

function makeOption(index) {
  return {
    id: `opt_${Date.now()}_${index}`,
    name: `Option #${index}`,
    line_items: [{ ...defaultItem }],
    subtotal: 0,
    tax_rate: 0,
    tax_amount: 0,
    discount: 0,
    total: 0,
    notes: "",
  };
}

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
  const [activeOptionIdx, setActiveOptionIdx] = useState(0);

  const loadData = useCallback(async () => {
    const [ests, c] = await Promise.all([
      base44.entities.Estimate.filter({ id }),
      activeCompany ? base44.entities.Customer.filter({ company_id: activeCompany.id }) : Promise.resolve([]),
    ]);
    if (ests.length > 0) {
      const est = ests[0];
      // Migrate old estimates without options
      if (!est.options || est.options.length === 0) {
        const migratedOption = {
          id: `opt_${Date.now()}_1`,
          name: "Option #1",
          line_items: est.line_items || [{ ...defaultItem }],
          subtotal: est.subtotal || 0,
          tax_rate: est.tax_rate || 0,
          tax_amount: est.tax_amount || 0,
          discount: est.discount || 0,
          total: est.total || 0,
          notes: est.notes || "",
        };
        est.options = [migratedOption];
      }
      setEstimate(est);
      setForm({ ...est });
    }
    setCustomers(c);
    setLoading(false);
  }, [id, activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Option helpers ---
  function getOption() {
    return form?.options?.[activeOptionIdx] || null;
  }

  function updateOption(updatedOption) {
    const options = [...form.options];
    options[activeOptionIdx] = updatedOption;
    // The top-level total reflects the first/active option for backward compat
    const first = options[0];
    setForm(f => ({
      ...f,
      options,
      subtotal: first.subtotal,
      tax_rate: first.tax_rate,
      tax_amount: first.tax_amount,
      discount: first.discount,
      total: first.total,
      notes: first.notes,
      line_items: first.line_items,
    }));
  }

  function recalcOption(items, opt) {
    const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
    const tax_amount = subtotal * ((opt.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (opt.discount || 0);
    updateOption({ ...opt, line_items: items, subtotal, tax_amount, total });
  }

  function updateItem(index, field, value) {
    const opt = getOption();
    const items = [...opt.line_items];
    items[index] = { ...items[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      items[index].total = (items[index].quantity || 0) * (items[index].unit_price || 0);
    }
    recalcOption(items, opt);
  }

  function addItem() {
    const opt = getOption();
    const items = [...opt.line_items, { ...defaultItem }];
    updateOption({ ...opt, line_items: items });
  }

  function addServiceAsItem(service) {
    const opt = getOption();
    const items = [...opt.line_items];
    const last = items[items.length - 1];
    if (last && !last.description && !last.unit_price) items[items.length - 1] = service;
    else items.push(service);
    recalcOption(items, opt);
  }

  function removeItem(index) {
    const opt = getOption();
    const items = opt.line_items.filter((_, i) => i !== index);
    recalcOption(items, opt);
  }

  function addOption() {
    const newIdx = form.options.length + 1;
    const newOpt = makeOption(newIdx);
    const options = [...form.options, newOpt];
    setForm(f => ({ ...f, options }));
    setActiveOptionIdx(options.length - 1);
  }

  function removeOption(idx) {
    if (form.options.length <= 1) return;
    const options = form.options.filter((_, i) => i !== idx);
    setForm(f => ({ ...f, options }));
    setActiveOptionIdx(Math.max(0, activeOptionIdx >= options.length ? options.length - 1 : activeOptionIdx));
  }

  // --- Save / actions ---
  async function handleSave() {
    setSaving(true);
    await base44.entities.Estimate.update(id, form);
    setEstimate({ ...estimate, ...form });
    setSaving(false);
    setEditingInfo(false);
  }

  async function handleApprove() {
    setApproving(true);
    const opt = getOption();
    await base44.entities.Estimate.update(id, { ...form, status: "approved" });
    await base44.entities.Job.create({
      company_id: activeCompany.id,
      customer_id: form.customer_id,
      estimate_id: id,
      title: form.title,
      description: opt?.notes || "",
      status: "new",
      total_amount: opt?.total || form.total,
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
  const opt = getOption();

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
                    <span className="text-slate-900 font-semibold">${(opt?.total || form.total || 0).toLocaleString()}</span>
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
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile summary */}
          <div className="lg:hidden space-y-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm"><User className="w-3.5 h-3.5 text-slate-400" /><span>{getCustomerName(form.customer_id)}</span></div>
                <div className="flex items-center gap-2 text-sm"><DollarSign className="w-3.5 h-3.5 text-slate-400" /><span className="font-semibold">${(opt?.total || 0).toLocaleString()}</span></div>
              </CardContent>
            </Card>
            {canAct && (
              <div className="flex gap-2">
                <Button onClick={handleDecline} variant="outline" className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50"><XCircle className="w-4 h-4" /> Decline</Button>
                <Button onClick={handleApprove} disabled={approving} className="flex-1 gap-2 bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4" />{approving ? "..." : "Approve"}</Button>
              </div>
            )}
          </div>

          {/* Options tabs */}
          <Card className="border-0 shadow-sm">
            <div className="border-b border-slate-200 flex items-center px-4 overflow-x-auto">
              {(form.options || []).map((option, idx) => (
                <div key={option.id} className="flex items-center group flex-shrink-0">
                  <button
                    onClick={() => setActiveOptionIdx(idx)}
                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeOptionIdx === idx
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {option.name}
                  </button>
                  {(form.options || []).length > 1 && (
                    <button
                      onClick={() => removeOption(idx)}
                      className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded text-slate-400 hover:text-red-500 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addOption}
                className="py-3 px-4 text-sm font-medium text-blue-600 hover:text-blue-700 border-b-2 border-transparent flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Add option
              </button>
            </div>

            {/* Active option content */}
            {opt && (
              <CardContent className="pt-4 space-y-3">
                {/* Line items header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
                  <div className="flex items-center gap-2">
                    <ServicePicker companyId={activeCompany?.id} onSelect={addServiceAsItem} />
                    <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add Line</Button>
                  </div>
                </div>

                {opt.line_items?.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    <div className="col-span-5">Service / Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2">Price</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1" />
                  </div>
                )}

                {opt.line_items?.map((item, idx) => (
                  <LineItemRow
                    key={idx}
                    item={item}
                    idx={idx}
                    companyId={activeCompany?.id}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                  />
                ))}

                {/* Totals */}
                <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">${(opt.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Tax Rate (%)</span>
                    <Input type="number" value={opt.tax_rate || 0} onChange={e => {
                      const tax_rate = parseFloat(e.target.value) || 0;
                      const tax_amount = (opt.subtotal || 0) * (tax_rate / 100);
                      const total = (opt.subtotal || 0) + tax_amount - (opt.discount || 0);
                      updateOption({ ...opt, tax_rate, tax_amount, total });
                    }} className="w-20 h-7 text-sm bg-white" />
                    <span className="text-sm text-slate-500 ml-auto">${(opt.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-200">
                    <span>Total</span>
                    <span>${(opt.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Option notes */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Notes for this option</Label>
                  <Textarea
                    value={opt.notes || ""}
                    onChange={e => updateOption({ ...opt, notes: e.target.value })}
                    rows={2}
                    placeholder="Notes visible to customer for this option..."
                    className="text-sm"
                  />
                </div>
              </CardContent>
            )}
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