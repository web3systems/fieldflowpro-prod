import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import AccountingLayout from "../components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Layers } from "lucide-react";

const TYPE_COLORS = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-red-100 text-red-700",
  equity: "bg-purple-100 text-purple-700",
  revenue: "bg-green-100 text-green-700",
  expense: "bg-orange-100 text-orange-700",
};

const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cash", type: "asset", subtype: "current_asset", is_system: true },
  { code: "1100", name: "Accounts Receivable", type: "asset", subtype: "current_asset", is_system: true },
  { code: "1500", name: "Equipment", type: "asset", subtype: "fixed_asset", is_system: true },
  { code: "2000", name: "Accounts Payable", type: "liability", subtype: "current_liability", is_system: true },
  { code: "2100", name: "Credit Cards", type: "liability", subtype: "current_liability", is_system: true },
  { code: "3000", name: "Owner's Equity", type: "equity", subtype: "equity", is_system: true },
  { code: "4000", name: "Service Revenue", type: "revenue", subtype: "revenue", is_system: true },
  { code: "5000", name: "Cost of Goods Sold", type: "expense", subtype: "cogs", is_system: true },
  { code: "5100", name: "Payroll", type: "expense", subtype: "operating", is_system: true },
  { code: "5200", name: "Vehicle & Fuel", type: "expense", subtype: "operating", is_system: true },
  { code: "5300", name: "Equipment & Tools", type: "expense", subtype: "operating", is_system: true },
  { code: "5400", name: "Insurance", type: "expense", subtype: "operating", is_system: true },
  { code: "5500", name: "Marketing", type: "expense", subtype: "operating", is_system: true },
  { code: "5600", name: "Office & Admin", type: "expense", subtype: "operating", is_system: true },
  { code: "5700", name: "Subcontractors", type: "expense", subtype: "operating", is_system: true },
];

const defaultForm = { code: "", name: "", type: "expense", subtype: "", description: "" };

export default function AccountingAccounts() {
  const { activeCompany } = useApp();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const accts = await base44.entities.ChartOfAccount.filter({ company_id: activeCompany.id });
    setAccounts(accts.sort((a, b) => (a.code || "").localeCompare(b.code || "")));
    setLoading(false);
  }

  async function seedDefaults() {
    setSeeding(true);
    const existing = new Set(accounts.map(a => a.code));
    for (const acct of DEFAULT_ACCOUNTS) {
      if (!existing.has(acct.code)) {
        await base44.entities.ChartOfAccount.create({ ...acct, company_id: activeCompany.id, is_active: true });
      }
    }
    await loadData();
    setSeeding(false);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id };
    if (editing) {
      await base44.entities.ChartOfAccount.update(editing.id, data);
    } else {
      await base44.entities.ChartOfAccount.create({ ...data, is_active: true });
    }
    await loadData();
    setShowSheet(false);
    setForm(defaultForm);
    setEditing(null);
    setSaving(false);
  }

  function openEdit(acct) {
    setEditing(acct);
    setForm({ ...defaultForm, ...acct });
    setShowSheet(true);
  }

  const grouped = ["asset", "liability", "equity", "revenue", "expense"].reduce((acc, type) => {
    acc[type] = accounts.filter(a => a.type === type);
    return acc;
  }, {});

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts</h1>
          <div className="flex gap-2">
            {accounts.length === 0 && (
              <Button onClick={seedDefaults} disabled={seeding} variant="outline" size="sm" className="gap-2">
                <Layers className="w-3.5 h-3.5" />
                {seeding ? "Setting up..." : "Load Default Accounts"}
              </Button>
            )}
            <Button onClick={() => { setEditing(null); setForm(defaultForm); setShowSheet(true); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, accts]) => accts.length > 0 && (
              <Card key={type} className="border-0 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <Badge className={TYPE_COLORS[type]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>
                    <span className="text-xs text-slate-400">{accts.length} accounts</span>
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="divide-y divide-slate-100">
                    {accts.map(acct => (
                      <div key={acct.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(acct)}>
                        <span className="text-xs font-mono text-slate-400 w-12 shrink-0">{acct.code}</span>
                        <span className="text-sm font-medium text-slate-800 flex-1">{acct.name}</span>
                        {acct.subtype && <span className="text-xs text-slate-400">{acct.subtype.replace(/_/g, " ")}</span>}
                        {acct.is_system && <span className="text-xs text-slate-300 font-medium">system</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {accounts.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                No accounts yet. Click "Load Default Accounts" to get started.
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Account" : "New Account"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Account Code</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. 5100" />
            </div>
            <div>
              <Label className="text-xs">Account Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Vehicle Expenses" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Subtype (optional)</Label>
              <Input value={form.subtype} onChange={e => setForm(f => ({ ...f, subtype: e.target.value }))} placeholder="e.g. current_asset, operating" />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {saving ? "Saving..." : editing ? "Update" : "Create Account"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AccountingLayout>
  );
}