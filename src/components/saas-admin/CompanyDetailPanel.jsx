import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  X, Building2, Mail, Phone, Globe, MapPin, Calendar, CreditCard,
  Users, Briefcase, FileText, DollarSign, Clock, AlertTriangle,
  CheckCircle, RefreshCw, Ban, Send, ShieldCheck, ChevronRight,
  ExternalLink, Wrench, ToggleLeft, ToggleRight, Edit3, Save, Plus, Trash2, Pencil
} from "lucide-react";

const STATUS_COLORS = {
  trialing: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  past_due: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  paused: "bg-yellow-100 text-yellow-700",
};

const PLAN_COLORS = {
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  starter: "bg-slate-50 text-slate-700 border-slate-200",
  professional: "bg-purple-50 text-purple-700 border-purple-200",
  enterprise: "bg-amber-50 text-amber-700 border-amber-200",
};

const INDUSTRY_OPTIONS = ["cleaning","landscaping","handyman","painting","plumbing","electrical","hvac","other"];

export default function CompanyDetailPanel({ company, subscription, allCompanies = [], onClose, onRefresh }) {
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [editingSub, setEditingSub] = useState(false);
  const [subForm, setSubForm] = useState({
    plan: subscription?.plan || "starter",
    status: subscription?.status || "active",
    trial_ends_at: subscription?.trial_ends_at ? subscription.trial_ends_at.split("T")[0] : "",
    current_period_end: subscription?.current_period_end ? subscription.current_period_end.split("T")[0] : "",
  });
  const [note, setNote] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [subsidiaries, setSubsidiaries] = useState(allCompanies.filter(c => c.parent_company_id === company.id));
  const [editingSubId, setEditingSubId] = useState(null);
  const [editingSubForm, setEditingSubForm] = useState({});
  const [addingSubsidiary, setAddingSubsidiary] = useState(false);
  const [newSubForm, setNewSubForm] = useState({ name: "", industry: "other", is_active: true });
  const [subActionLoading, setSubActionLoading] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, [company.id]);

  async function loadMetrics() {
    setLoadingMetrics(true);
    try {
      const [jobs, customers, invoices, estimates, users] = await Promise.all([
        base44.entities.Job.filter({ company_id: company.id }),
        base44.entities.Customer.filter({ company_id: company.id }),
        base44.entities.Invoice.filter({ company_id: company.id }),
        base44.entities.Estimate.filter({ company_id: company.id }),
        base44.entities.UserCompanyAccess.filter({ company_id: company.id }),
      ]);

      const paidInvoices = invoices.filter(i => i.status === "paid");
      const totalRevenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
      const activeJobs = jobs.filter(j => j.status === "in_progress" || j.status === "scheduled").length;

      setMetrics({
        jobs: jobs.length,
        activeJobs,
        customers: customers.length,
        invoices: invoices.length,
        estimates: estimates.length,
        totalRevenue,
        teamMembers: users.length,
      });
    } catch (e) {
      console.error("metrics error", e);
    } finally {
      setLoadingMetrics(false);
    }
  }

  async function handleSaveSub() {
    setActionLoading("save_sub");
    try {
      if (subscription?.id) {
        await base44.entities.Subscription.update(subscription.id, subForm);
        setActionMsg("Subscription updated successfully.");
      }
      setEditingSub(false);
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleActive() {
    setActionLoading("toggle");
    try {
      await base44.entities.Company.update(company.id, { is_active: !company.is_active });
      setActionMsg(`Company ${company.is_active ? "deactivated" : "reactivated"}.`);
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExtendTrial(days) {
    if (!subscription?.id) return;
    setActionLoading("extend");
    try {
      const current = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : new Date();
      const newDate = new Date(current);
      newDate.setDate(newDate.getDate() + days);
      await base44.entities.Subscription.update(subscription.id, {
        trial_ends_at: newDate.toISOString(),
        status: "trialing",
      });
      setActionMsg(`Trial extended by ${days} days.`);
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleSubActive(sub) {
    setSubActionLoading(sub.id + "_toggle");
    await base44.entities.Company.update(sub.id, { is_active: !sub.is_active });
    setSubsidiaries(prev => prev.map(s => s.id === sub.id ? { ...s, is_active: !s.is_active } : s));
    setSubActionLoading(null);
  }

  function startEditSub(sub) {
    setEditingSubId(sub.id);
    setEditingSubForm({ name: sub.name, industry: sub.industry || "other", phone: sub.phone || "", email: sub.email || "" });
  }

  async function handleSaveSubEdit() {
    setSubActionLoading(editingSubId + "_save");
    await base44.entities.Company.update(editingSubId, editingSubForm);
    setSubsidiaries(prev => prev.map(s => s.id === editingSubId ? { ...s, ...editingSubForm } : s));
    setEditingSubId(null);
    setSubActionLoading(null);
  }

  async function handleDeleteSub(sub) {
    if (!window.confirm(`Remove ${sub.name} as a subsidiary? This won't delete the company, just unlinks it from the parent.`)) return;
    setSubActionLoading(sub.id + "_delete");
    await base44.entities.Company.update(sub.id, { parent_company_id: null });
    setSubsidiaries(prev => prev.filter(s => s.id !== sub.id));
    setSubActionLoading(null);
  }

  async function handleAddSubsidiary() {
    if (!newSubForm.name.trim()) return;
    setSubActionLoading("adding");
    const created = await base44.entities.Company.create({ ...newSubForm, parent_company_id: company.id });
    setSubsidiaries(prev => [...prev, created]);
    setNewSubForm({ name: "", industry: "other", is_active: true });
    setAddingSubsidiary(false);
    setSubActionLoading(null);
    setActionMsg(`Subsidiary "${created.name}" created.`);
  }

  async function handleCancelSubscription() {
    if (!subscription?.id) return;
    if (!window.confirm("Cancel this company's subscription? They will lose access.")) return;
    setActionLoading("cancel");
    try {
      await base44.entities.Subscription.update(subscription.id, {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      });
      setActionMsg("Subscription cancelled.");
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  }

  const daysOnPlatform = company.created_date
    ? differenceInDays(new Date(), new Date(company.created_date))
    : null;

  const trialDaysLeft = subscription?.trial_ends_at
    ? differenceInDays(new Date(subscription.trial_ends_at), new Date())
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ backgroundColor: company.primary_color || "#3b82f6" }}
            >
              {company.name?.[0] || "?"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{company.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {subscription && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[subscription.status] || ""}`}>
                    {subscription.status}
                  </span>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${PLAN_COLORS[subscription?.plan] || PLAN_COLORS.starter}`}>
                  {subscription?.plan || "No plan"} plan
                </span>
                {!company.is_active && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Deactivated</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionMsg && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {actionMsg}
            <button onClick={() => setActionMsg("")} className="ml-auto text-green-500 hover:text-green-700"><X className="w-3 h-3" /></button>
          </div>
        )}

        <div className="flex-1 p-6 space-y-6">

          {/* Key Dates */}
          <Section title="Account Timeline" icon={Calendar}>
            <div className="grid grid-cols-2 gap-3">
              <InfoTile label="Signed Up" value={company.created_date ? format(new Date(company.created_date), "MMM d, yyyy") : "—"} sub={daysOnPlatform !== null ? `${daysOnPlatform} days ago` : ""} />
              <InfoTile label="Days on Platform" value={daysOnPlatform !== null ? `${daysOnPlatform} days` : "—"} />
              {subscription?.trial_ends_at && (
                <InfoTile
                  label="Trial Ends"
                  value={format(new Date(subscription.trial_ends_at), "MMM d, yyyy")}
                  sub={trialDaysLeft !== null ? (trialDaysLeft < 0 ? "Expired" : `${trialDaysLeft} days left`) : ""}
                  highlight={trialDaysLeft !== null && trialDaysLeft < 3}
                />
              )}
              {subscription?.current_period_end && (
                <InfoTile label="Next Billing" value={format(new Date(subscription.current_period_end), "MMM d, yyyy")} />
              )}
              {subscription?.cancelled_at && (
                <InfoTile label="Cancelled On" value={format(new Date(subscription.cancelled_at), "MMM d, yyyy")} highlight />
              )}
            </div>
          </Section>

          {/* Contact Info */}
          <Section title="Contact & Profile" icon={Building2}>
            <div className="grid grid-cols-2 gap-3">
              <InfoTile label="Owner Email" value={subscription?.owner_email || company.email || "—"} />
              <InfoTile label="Owner Name" value={subscription?.owner_name || "—"} />
              <InfoTile label="Phone" value={company.phone || "—"} />
              <InfoTile label="Industry" value={company.industry || "—"} capitalize />
              <InfoTile label="Website" value={company.website || "—"} />
              <InfoTile label="Location" value={[company.city, company.state].filter(Boolean).join(", ") || "—"} />
            </div>
          </Section>

          {/* Usage Metrics */}
          <Section title="Usage Metrics" icon={Briefcase}>
            {loadingMetrics ? (
              <div className="text-sm text-slate-400">Loading metrics...</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <MetricTile label="Customers" value={metrics?.customers ?? "—"} icon={Users} color="blue" />
                <MetricTile label="Total Jobs" value={metrics?.jobs ?? "—"} icon={Briefcase} color="orange" />
                <MetricTile label="Active Jobs" value={metrics?.activeJobs ?? "—"} icon={RefreshCw} color="green" />
                <MetricTile label="Estimates" value={metrics?.estimates ?? "—"} icon={FileText} color="yellow" />
                <MetricTile label="Invoices" value={metrics?.invoices ?? "—"} icon={DollarSign} color="emerald" />
                <MetricTile label="Team Members" value={metrics?.teamMembers ?? "—"} icon={Wrench} color="purple" />
              </div>
            )}
            {metrics && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-xs text-slate-500">Total Customer Revenue (paid invoices)</p>
                <p className="text-xl font-bold text-emerald-700">${metrics.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
            )}
          </Section>

          {/* Subscription Management */}
          <Section title="Subscription" icon={CreditCard} action={
            <button onClick={() => setEditingSub(!editingSub)} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> {editingSub ? "Cancel" : "Edit"}
            </button>
          }>
            {editingSub ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Plan</label>
                    <Select value={subForm.plan} onValueChange={v => setSubForm(f => ({ ...f, plan: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Status</label>
                    <Select value={subForm.status} onValueChange={v => setSubForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trialing">Trialing</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="past_due">Past Due</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Trial Ends</label>
                    <Input type="date" value={subForm.trial_ends_at} onChange={e => setSubForm(f => ({ ...f, trial_ends_at: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Period End</label>
                    <Input type="date" value={subForm.current_period_end} onChange={e => setSubForm(f => ({ ...f, current_period_end: e.target.value }))} className="h-8 text-sm" />
                  </div>
                </div>
                <Button size="sm" onClick={handleSaveSub} disabled={actionLoading === "save_sub"} className="gap-1">
                  <Save className="w-3.5 h-3.5" /> {actionLoading === "save_sub" ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <InfoTile label="Plan" value={subscription?.plan || "—"} capitalize />
                <InfoTile label="Status" value={subscription?.status || "—"} capitalize />
                <InfoTile label="Stripe Customer" value={subscription?.stripe_customer_id || "—"} mono />
                <InfoTile label="Stripe Sub ID" value={subscription?.stripe_subscription_id || "—"} mono />
              </div>
            )}
          </Section>

          {/* Admin Actions */}
          <Section title="Admin Actions" icon={ShieldCheck}>
            <div className="space-y-3">

              {/* Extend Trial */}
              {(subscription?.status === "trialing" || !subscription) && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Extend Trial Period</p>
                  <div className="flex gap-2 flex-wrap">
                    {[7, 14, 30].map(days => (
                      <Button key={days} size="sm" variant="outline" onClick={() => handleExtendTrial(days)} disabled={actionLoading === "extend"} className="text-xs h-7">
                        +{days} days
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Activate / Deactivate */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Company Access</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {company.is_active ? "Company is active and accessible." : "Company is deactivated — staff cannot log in."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={company.is_active ? "destructive" : "default"}
                  onClick={handleToggleActive}
                  disabled={actionLoading === "toggle"}
                  className="text-xs gap-1 ml-3"
                >
                  {company.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {actionLoading === "toggle" ? "..." : company.is_active ? "Deactivate" : "Reactivate"}
                </Button>
              </div>

              {/* Cancel Subscription */}
              {subscription && subscription.status !== "cancelled" && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-red-700">Cancel Subscription</p>
                    <p className="text-xs text-red-400 mt-0.5">Marks subscription as cancelled immediately.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleCancelSubscription}
                    disabled={actionLoading === "cancel"}
                    className="text-xs ml-3"
                  >
                    {actionLoading === "cancel" ? "..." : "Cancel Sub"}
                  </Button>
                </div>
              )}

              {/* Stripe Dashboard link */}
              {subscription?.stripe_customer_id && (
                <a
                  href={`https://dashboard.stripe.com/customers/${subscription.stripe_customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-700">Open in Stripe Dashboard</span>
                </a>
              )}
            </div>
          </Section>

          {/* Subsidiaries — full management for master companies */}
          {!company.parent_company_id && (
            <Section
              title={`Subsidiaries (${subsidiaries.length})`}
              icon={Building2}
              action={
                <button
                  onClick={() => setAddingSubsidiary(v => !v)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              }
            >
              <div className="space-y-2">
                {/* Add new subsidiary form */}
                {addingSubsidiary && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-blue-800 mb-1">New Subsidiary</p>
                    <Input
                      value={newSubForm.name}
                      onChange={e => setNewSubForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Subsidiary name..."
                      className="h-8 text-sm"
                    />
                    <Select value={newSubForm.industry} onValueChange={v => setNewSubForm(f => ({ ...f, industry: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map(i => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddSubsidiary} disabled={subActionLoading === "adding" || !newSubForm.name.trim()} className="gap-1 text-xs h-7">
                        <Save className="w-3 h-3" /> {subActionLoading === "adding" ? "Creating..." : "Create"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingSubsidiary(false)} className="text-xs h-7">Cancel</Button>
                    </div>
                  </div>
                )}

                {subsidiaries.length === 0 && !addingSubsidiary && (
                  <p className="text-sm text-slate-400 py-2">No subsidiaries yet. Add one above.</p>
                )}

                {subsidiaries.map(sub => (
                  <div key={sub.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    {editingSubId === sub.id ? (
                      <div className="p-3 bg-slate-50 space-y-2">
                        <Input
                          value={editingSubForm.name}
                          onChange={e => setEditingSubForm(f => ({ ...f, name: e.target.value }))}
                          className="h-8 text-sm"
                          placeholder="Name"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={editingSubForm.industry} onValueChange={v => setEditingSubForm(f => ({ ...f, industry: v }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {INDUSTRY_OPTIONS.map(i => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input value={editingSubForm.phone} onChange={e => setEditingSubForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-sm" placeholder="Phone" />
                        </div>
                        <Input value={editingSubForm.email} onChange={e => setEditingSubForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-sm" placeholder="Email" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveSubEdit} disabled={subActionLoading === sub.id + "_save"} className="gap-1 text-xs h-7">
                            <Save className="w-3 h-3" /> {subActionLoading === sub.id + "_save" ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSubId(null)} className="text-xs h-7">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: sub.primary_color || '#64748b' }}
                        >
                          {sub.name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{sub.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{sub.industry}{sub.email ? ` · ${sub.email}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sub.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {sub.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <button onClick={() => startEditSub(sub)} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleSubActive(sub)}
                            disabled={subActionLoading === sub.id + "_toggle"}
                            className={`p-1 rounded text-xs font-medium ${sub.is_active ? 'text-amber-500 hover:text-amber-700' : 'text-green-500 hover:text-green-700'}`}
                            title={sub.is_active ? "Deactivate" : "Reactivate"}
                          >
                            {sub.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteSub(sub)}
                            disabled={subActionLoading === sub.id + "_delete"}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Unlink subsidiary"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {subsidiaries.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">Subsidiaries share this company's subscription. Unlink removes the parent relationship without deleting the company.</p>
                )}
              </div>
            </Section>
          )}

          {/* Stripe Connect */}
          <Section title="Integrations" icon={CheckCircle}>
            <div className="grid grid-cols-2 gap-3">
              <InfoTile
                label="Stripe Connect"
                value={company.stripe_onboarding_complete ? "✓ Connected" : "Not connected"}
                highlight={!company.stripe_onboarding_complete}
              />
              <InfoTile label="Stripe Account ID" value={company.stripe_account_id || "—"} mono />
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: SectionIcon, children, action }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SectionIcon className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoTile({ label, value, sub, highlight, capitalize, mono }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold truncate ${highlight ? "text-red-600" : "text-slate-800"} ${capitalize ? "capitalize" : ""} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
      {sub && <p className={`text-xs mt-0.5 ${highlight ? "text-red-400" : "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

const colorMap = {
  blue: "text-blue-600 bg-blue-50",
  orange: "text-orange-600 bg-orange-50",
  green: "text-green-600 bg-green-50",
  yellow: "text-yellow-600 bg-yellow-50",
  emerald: "text-emerald-600 bg-emerald-50",
  purple: "text-purple-600 bg-purple-50",
};

function MetricTile({ label, value, icon: MetricIcon, color }) {
  return (
    <div className={`rounded-lg p-3 ${colorMap[color] || "bg-slate-50 text-slate-600"}`}>
      <MetricIcon className="w-4 h-4 mb-1 opacity-70" />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
}