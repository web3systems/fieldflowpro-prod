import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import AccountingLayout from "../components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Percent, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function ProfitMargin() {
  const { activeCompany } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [inv, exp] = await Promise.all([
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.AccountingTransaction.filter({ company_id: activeCompany.id, type: "expense" }),
    ]);
    setInvoices(inv);
    setExpenses(exp);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    const [inv, exp] = await Promise.all([
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.AccountingTransaction.filter({ company_id: activeCompany.id, type: "expense" }),
    ]);
    setInvoices(inv);
    setExpenses(exp);
    setRefreshing(false);
  }

  const totalRevenue = invoices.filter(i => ["paid", "partial"].includes(i.status)).reduce((s, i) => s + (i.amount_paid || i.total || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Monthly breakdown for last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const revenue = invoices
      .filter(inv => ["paid", "partial"].includes(inv.status))
      .filter(inv => {
        const dt = new Date(inv.paid_date || inv.updated_date);
        return dt >= start && dt <= end;
      })
      .reduce((s, inv) => s + (inv.amount_paid || inv.total || 0), 0);
    const exps = expenses
      .filter(e => {
        const dt = new Date(e.date);
        return dt >= start && dt <= end;
      })
      .reduce((s, e) => s + (e.amount || 0), 0);
    const profit = revenue - exps;
    return {
      month: format(d, "MMM"),
      Revenue: parseFloat(revenue.toFixed(2)),
      Expenses: parseFloat(exps.toFixed(2)),
      "Net Profit": parseFloat(profit.toFixed(2)),
    };
  });

  // Per-job profit breakdown
  const jobRevenue = invoices
    .filter(i => i.job_id && ["paid", "partial"].includes(i.status))
    .reduce((acc, inv) => {
      acc[inv.job_id] = (acc[inv.job_id] || 0) + (inv.amount_paid || inv.total || 0);
      return acc;
    }, {});

  // Expense by category breakdown
  const expByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || "Other";
    acc[cat] = (acc[cat] || 0) + (e.amount || 0);
    return acc;
  }, {});

  const categoryRows = Object.entries(expByCategory).sort((a, b) => b[1] - a[1]);
  const totalCatExpenses = Object.values(expByCategory).reduce((s, v) => s + v, 0);

  if (loading) return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    </AccountingLayout>
  );

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Profit Margin</h1>
            <p className="text-slate-500 text-sm mt-0.5">Invoice revenue minus all logged expenses</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm" className="gap-1">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-400 mt-1">From paid invoices</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Total Expenses</p>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-400 mt-1">All logged expenses</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Net Profit</p>
                <DollarSign className="w-4 h-4 text-indigo-500" />
              </div>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-indigo-700" : "text-red-700"}`}>
                ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Revenue − Expenses</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Profit Margin</p>
                <Percent className="w-4 h-4 text-amber-500" />
              </div>
              <p className={`text-2xl font-bold ${Number(margin) >= 20 ? "text-green-700" : Number(margin) >= 0 ? "text-amber-600" : "text-red-700"}`}>
                {margin}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Net / Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue vs Expenses vs Net Profit (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Revenue" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="Net Profit" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No expenses logged yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryRows.map(([cat, amt]) => {
                  const pct = totalCatExpenses > 0 ? (amt / totalCatExpenses) * 100 : 0;
                  const revenueImpact = totalRevenue > 0 ? (amt / totalRevenue) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 font-medium">{cat}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{revenueImpact.toFixed(1)}% of revenue</span>
                          <span className="text-slate-900 font-semibold">${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AccountingLayout>
  );
}