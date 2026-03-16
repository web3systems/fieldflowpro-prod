import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import AccountingLayout from "../components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Building2, CreditCard, Landmark } from "lucide-react";

const TYPE_ICONS = {
  checking: Landmark,
  savings: Landmark,
  credit_card: CreditCard,
  line_of_credit: CreditCard,
  other: Building2,
};

const defaultForm = { name: "", institution: "", account_type: "checking", last_four: "", current_balance: "", notes: "" };

export default function AccountingBanks() {
  const { activeCompany } = useApp();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const accts = await base44.entities.BankAccount.filter({ company_id: activeCompany.id });
    setAccounts(accts);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id, current_balance: parseFloat(form.current_balance) || 0 };
    if (editing) {
      await base44.entities.BankAccount.update(editing.id, data);
    } else {
      await base44.entities.BankAccount.create({ ...data, is_active: true });
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

  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance || 0), 0);

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bank Accounts</h1>
            <p className="text-slate-500 text-sm mt-0.5">Total Cash Position: <span className="font-semibold text-slate-800">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
          </div>
          <Button onClick={() => { setEditing(null); setForm(defaultForm); setShowSheet(true); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Add Account
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No bank accounts yet. Add your first account to track your cash position.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {accounts.map(acct => {
              const Icon = TYPE_ICONS[acct.account_type] || Building2;
              return (
                <Card key={acct.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(acct)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 truncate">{acct.name}</p>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">{acct.account_type.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {acct.institution && `${acct.institution} `}{acct.last_four && `···· ${acct.last_four}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${acct.current_balance >= 0 ? "text-slate-900" : "text-red-600"}`}>
                        ${(acct.current_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Account" : "Add Bank Account"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Account Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Business Checking" />
            </div>
            <div>
              <Label className="text-xs">Bank / Institution</Label>
              <Input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="e.g. Chase, Bank of America" />
            </div>
            <div>
              <Label className="text-xs">Account Type</Label>
              <Select value={form.account_type} onValueChange={v => setForm(f => ({ ...f, account_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="line_of_credit">Line of Credit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Last 4 Digits</Label>
              <Input value={form.last_four} onChange={e => setForm(f => ({ ...f, last_four: e.target.value }))} placeholder="1234" maxLength={4} />
            </div>
            <div>
              <Label className="text-xs">Current Balance ($)</Label>
              <Input type="number" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {saving ? "Saving..." : editing ? "Update" : "Add Account"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AccountingLayout>
  );
}