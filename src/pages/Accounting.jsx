import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import AccountingLayout from "../components/accounting/AccountingLayout";
import UpgradeNudge from "@/components/subscription/UpgradeNudge";
import { canAccessFeature } from "@/lib/subscription";
import AIInsightsPanel from "../components/accounting/AIInsightsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SyncModal from "@/components/accounting/SyncModal";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

export default function Accounting() {
  const { activeCompany } = useApp();
  const [subscription, setSubscription] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSync, setShowSync] = useState(false);

  useEffect(() => {
    if (activeCompany) {
      loadData();
      base44.entities.Subscription.filter({ company_id: activeCompany.id })
        .then(subs => setSubscription(subs[0] || null)).catch(() => {});
    }
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [txns, accts] = await Promise.all([
      base44.entities.AccountingTransaction.filter({ company_id: activeCompany.id }),
      base44.entities.ChartOfAccount.filter({ company_id: activeCompany.id }),
    ]);
    setTransactions(txns);
    setAccounts(accts);
    setLoading(false);
  }



  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const netProfit = income - expenses;
  const profitMargin = income > 0 ? ((netProfit / income) * 100).toFixed(1) : 0;

  // Last 6 months chart data
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const monthTxns = transactions.filter(t => {
      const td = new Date(t.date);
      return td >= start && td <= end;
    });
    return {
      month: format(d, "MMM"),
      income: monthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expenses: monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });

  // Top expense categories
  const expenseByCategory = Object.entries(
    transactions.filter(t => t.type === "expense").reduce((acc, t) => {
      const cat = t.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (loading) return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    </AccountingLayout>
  );

  const hasAccess = canAccessFeature(subscription, 'accounting');

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-6">
      {!hasAccess && (
        <UpgradeNudge
          feature="Accounting Module"
          description="Track income, expenses, and profit with a full chart of accounts, P&L reports, and AI-powered insights."
          requiredPlan="Professional"
          company={activeCompany}
        />
      )}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
            <p className="text-slate-500 text-sm mt-0.5">All time summary for {activeCompany?.name}</p>
          </div>
          <Button onClick={() => setShowSync(true)} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Sync from FieldFlow
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Total Income</p>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">${income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Total Expenses</p>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">${expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Net Profit</p>
                <DollarSign className="w-4 h-4 text-indigo-500" />
              </div>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Profit Margin</p>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <p className={`text-2xl font-bold ${profitMargin >= 0 ? "text-slate-900" : "text-red-700"}`}>{profitMargin}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Income vs Expenses (6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" radius={[4,4,0,0]} name="Income" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4,4,0,0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseByCategory.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No expense data yet</div>
              ) : (
                <div className="space-y-3 mt-2">
                  {expenseByCategory.map(([cat, amt]) => {
                    const pct = expenses > 0 ? (amt / expenses) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700 font-medium">{cat}</span>
                          <span className="text-slate-500">${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <AIInsightsPanel companyId={activeCompany?.id} transactions={transactions} accounts={accounts} />
      </div>

      <SyncModal
        open={showSync}
        onClose={() => setShowSync(false)}
        companyId={activeCompany?.id}
        onSynced={loadData}
      />
    </AccountingLayout>
  );
}