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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Building2, CreditCard, Landmark, CheckCircle, XCircle, RefreshCw, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";

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
  const [refreshing, setRefreshing] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Reconciliation
  const [reconcileAccount, setReconcileAccount] = useState(null);
  const [reconcileTxns, setReconcileTxns] = useState([]);
  const [selectedTxns, setSelectedTxns] = useState(new Set());
  const [reconciling, setReconciling] = useState(false);
  const [statementBalance, setStatementBalance] = useState("");

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const accts = await base44.entities.BankAccount.filter({ company_id: activeCompany.id });
    setAccounts(accts);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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

  async function openReconcile(acct) {
    setReconcileAccount(acct);
    setStatementBalance("");
    setSelectedTxns(new Set());
    setReconciling(false);

    // Load all transactions for this company that are in cleared/pending state
    const txns = await base44.entities.AccountingTransaction.filter({
      company_id: activeCompany.id,
    }, "-date");
    setReconcileTxns(txns.filter(t => t.status !== "reconciled"));
  }

  function toggleTxn(id) {
    setSelectedTxns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function completeReconciliation() {
    if (!statementBalance || parseFloat(statementBalance) === 0) return;
    setReconciling(true);

    const stmtBal = parseFloat(statementBalance);
    const clearedTotal = Array.from(selectedTxns).reduce((sum, id) => {
      const txn = reconcileTxns.find(t => t.id === id);
      if (!txn) return sum;
      return sum + (txn.type === "income" ? (txn.amount || 0) : -(txn.amount || 0));
    }, 0);

    // Mark selected transactions as reconciled
    for (const id of selectedTxns) {
      await base44.entities.AccountingTransaction.update(id, { status: "reconciled", bank_account_id: reconcileAccount.id });
    }

    // Update bank account balance
    await base44.entities.BankAccount.update(reconcileAccount.id, {
      current_balance: stmtBal,
      notes: (reconcileAccount.notes || "") + `\nReconciled ${format(new Date(), "MMM d, yyyy")}: ${selectedTxns.size} txns cleared`,
    });

    await loadData();
    setReconcileAccount(null);
    setReconciling(false);
  }

  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance || 0), 0);
  const unreconciledCount = accounts.length; // simplified

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bank Accounts</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Total Cash Position: <span className="font-semibold text-slate-800">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm" className="gap-1">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => { setEditing(null); setForm(defaultForm); setShowSheet(true); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          </div>
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
                <Card key={acct.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => openEdit(acct)} style={{ cursor: "pointer" }}>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 gap-1"
                        onClick={(e) => { e.stopPropagation(); openReconcile(acct); }}
                      >
                        <ArrowLeftRight className="w-3 h-3" /> Reconcile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Sheet */}
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

      {/* Reconciliation Dialog */}
      <Dialog open={!!reconcileAccount} onOpenChange={() => setReconcileAccount(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
              Reconcile: {reconcileAccount?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Check off transactions that appear on your bank statement, then enter the statement ending balance to complete reconciliation.
            </p>

            {/* Statement Balance */}
            <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg">
              <Label className="text-sm font-medium text-indigo-900">Statement Ending Balance ($)</Label>
              <Input
                type="number"
                value={statementBalance}
                onChange={e => setStatementBalance(e.target.value)}
                placeholder="0.00"
                className="w-48 bg-white"
              />
              <Button
                onClick={completeReconciliation}
                disabled={reconciling || !statementBalance || selectedTxns.size === 0}
                className="ml-auto gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {reconciling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {reconciling ? "Reconciling..." : `Complete (${selectedTxns.size} txns)`}
              </Button>
            </div>

            {/* Transaction List */}
            <div className="text-xs text-slate-400">
              {reconcileTxns.length} unreconciled transactions
            </div>
            {reconcileTxns.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No unreconciled transactions found.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto border rounded-lg">
                {reconcileTxns.map(txn => {
                  const isSelected = selectedTxns.has(txn.id);
                  return (
                    <label
                      key={txn.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? "bg-green-50" : ""}`}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleTxn(txn.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{txn.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400">{txn.date}</span>
                          <Badge className={`text-xs ${txn.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {txn.type}
                          </Badge>
                          {txn.category && <span className="text-xs text-slate-400">· {txn.category}</span>}
                        </div>
                      </div>
                      <p className={`text-sm font-semibold w-24 text-right shrink-0 ${txn.type === "income" ? "text-green-700" : "text-red-700"}`}>
                        {txn.type === "income" ? "+" : "-"}${(txn.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Totals */}
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
              <span className="text-slate-600">
                {selectedTxns.size} selected — cleared total:
              </span>
              <span className="font-bold text-slate-900">
                ${Array.from(selectedTxns).reduce((sum, id) => {
                  const txn = reconcileTxns.find(t => t.id === id);
                  if (!txn) return sum;
                  return sum + (txn.type === "income" ? (txn.amount || 0) : -(txn.amount || 0));
                }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}