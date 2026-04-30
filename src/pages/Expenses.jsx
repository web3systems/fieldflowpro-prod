import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import AccountingLayout from "../components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Trash2, TrendingDown, DollarSign, Tag, Calendar } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = [
  "Materials & Supplies",
  "Labor",
  "Equipment",
  "Fuel & Transportation",
  "Marketing & Advertising",
  "Software & Tools",
  "Insurance",
  "Utilities",
  "Office Expenses",
  "Subcontractors",
  "Taxes & Fees",
  "Other",
];

const defaultForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  amount: "",
  category: "",
  notes: "",
};

export default function Expenses() {
  const { activeCompany } = useApp();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (activeCompany) loadExpenses();
  }, [activeCompany]);

  async function loadExpenses() {
    setLoading(true);
    const data = await base44.entities.AccountingTransaction.filter({
      company_id: activeCompany.id,
      type: "expense",
    }, "-date");
    setExpenses(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!form.description || !form.amount || !form.date) return;
    setSaving(true);
    await base44.entities.AccountingTransaction.create({
      company_id: activeCompany.id,
      type: "expense",
      source: "manual",
      status: "cleared",
      date: form.date,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category || "Other",
      notes: form.notes,
    });
    setForm(defaultForm);
    setShowForm(false);
    await loadExpenses();
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this expense?")) return;
    await base44.entities.AccountingTransaction.delete(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const filtered = expenses.filter(e => {
    const matchCat = filterCategory === "all" || e.category === filterCategory;
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalExpenses = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
            <p className="text-slate-500 text-sm mt-0.5">Log and categorize business expenses</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-red-500 hover:bg-red-600">
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        </div>

        {/* Add Expense Form */}
        {showForm && (
          <Card className="border-red-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-red-700">New Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Date *</label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Description *</label>
                  <Input placeholder="e.g. Lumber from Home Depot" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Amount ($) *</label>
                  <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Category</label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs text-slate-500 mb-1 block">Notes (optional)</label>
                  <Input placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => { setShowForm(false); setForm(defaultForm); }}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.description || !form.amount} className="bg-red-500 hover:bg-red-600">
                  {saving ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Total Expenses</p>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600">${expenses.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Showing</p>
                <DollarSign className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-400 mt-0.5">{filtered.length} records</p>
            </CardContent>
          </Card>
          {byCategory.slice(0, 2).map(({ cat, total }) => (
            <Card key={cat} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 font-medium truncate">{cat}</p>
                  <Tag className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                </div>
                <p className="text-2xl font-bold text-slate-900">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="sm:w-64" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Expenses Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <TrendingDown className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-sm">No expenses yet. Add your first expense above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Date</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Description</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Category</th>
                      <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Amount</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                            {exp.date ? format(new Date(exp.date), "MMM d, yyyy") : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{exp.description}</p>
                          {exp.notes && <p className="text-xs text-slate-400 mt-0.5">{exp.notes}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-slate-100 text-slate-600 text-xs">{exp.category || "Other"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600 text-sm">
                          -${(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDelete(exp.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AccountingLayout>
  );
}