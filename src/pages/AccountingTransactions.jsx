import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import AccountingLayout from "../components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Sparkles, X, Check, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { base44 as b44 } from "@/api/base44Client";

const TYPE_COLORS = {
  income: "bg-green-100 text-green-700",
  expense: "bg-red-100 text-red-700",
  transfer: "bg-blue-100 text-blue-700",
  journal: "bg-purple-100 text-purple-700",
};

const defaultForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  amount: "",
  type: "expense",
  category: "",
  notes: "",
  status: "pending",
};

export default function AccountingTransactions() {
  const { activeCompany } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [aiCatLoading, setAiCatLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [txns, accts] = await Promise.all([
      base44.entities.AccountingTransaction.filter({ company_id: activeCompany.id }),
      base44.entities.ChartOfAccount.filter({ company_id: activeCompany.id }),
    ]);
    setTransactions(txns.sort((a, b) => new Date(b.date) - new Date(a.date)));
    setAccounts(accts);
    setLoading(false);
  }

  async function aiCategorize() {
    if (!form.description) return;
    setAiCatLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Categorize this financial transaction for a field service business. 
Transaction: "${form.description}", Amount: $${form.amount}, Type: ${form.type}

Respond with ONLY a short category name (2-4 words max). Examples: "Service Revenue", "Vehicle Fuel", "Office Supplies", "Equipment Repair", "Insurance", "Marketing", "Payroll", "Subcontractors".`,
    });
    setForm(f => ({ ...f, category: result.trim() }));
    setAiCatLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id, amount: parseFloat(form.amount) || 0 };
    if (editing) {
      await base44.entities.AccountingTransaction.update(editing.id, data);
    } else {
      await base44.entities.AccountingTransaction.create(data);
    }
    await loadData();
    setShowSheet(false);
    setForm(defaultForm);
    setEditing(null);
    setSaving(false);
  }

  function openEdit(txn) {
    setEditing(txn);
    setForm({ ...defaultForm, ...txn });
    setShowSheet(true);
  }

  function openNew() {
    setEditing(null);
    setForm(defaultForm);
    setShowSheet(true);
  }

  async function handleDelete(id) {
    await base44.entities.AccountingTransaction.delete(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  const filtered = transactions.filter(t => {
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <Button onClick={openNew} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Add Transaction
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="journal">Journal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No transactions found. Add your first one!</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map(txn => (
                  <div key={txn.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(txn)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{txn.description}</p>
                        {txn.source === "invoice" && <span className="text-xs text-slate-400">(synced)</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{txn.date}</span>
                        {txn.category && <span className="text-xs text-slate-500">· {txn.category}</span>}
                      </div>
                    </div>
                    <Badge className={`text-xs shrink-0 ${TYPE_COLORS[txn.type]}`}>{txn.type}</Badge>
                    <p className={`text-sm font-semibold w-24 text-right shrink-0 ${txn.type === "income" ? "text-green-700" : "text-red-700"}`}>
                      {txn.type === "income" ? "+" : "-"}${(txn.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Transaction" : "Add Transaction"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="journal">Journal Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this transaction?" />
            </div>
            <div>
              <Label className="text-xs">Amount ($)</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Category</Label>
                <button onClick={aiCategorize} disabled={aiCatLoading || !form.description} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40">
                  <Sparkles className="w-3 h-3" />
                  {aiCatLoading ? "Categorizing..." : "AI Suggest"}
                </button>
              </div>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Vehicle Fuel, Service Revenue" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {saving ? "Saving..." : editing ? "Update" : "Add Transaction"}
              </Button>
              {editing && (
                <Button variant="destructive" size="sm" onClick={() => { handleDelete(editing.id); setShowSheet(false); }}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AccountingLayout>
  );
}