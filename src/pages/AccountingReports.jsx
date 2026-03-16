import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import AccountingLayout from "../components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

export default function AccountingReports() {
  const { activeCompany } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const txns = await base44.entities.AccountingTransaction.filter({ company_id: activeCompany.id });
    setTransactions(txns);
    setLoading(false);
  }

  function getDateRange() {
    const now = new Date();
    switch (period) {
      case "this_month": return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month": return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case "last_3_months": return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case "ytd": return { start: startOfYear(now), end: now };
      default: return { start: new Date("2000-01-01"), end: now };
    }
  }

  const { start, end } = getDateRange();
  const periodTxns = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  const income = periodTxns.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = periodTxns.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const netProfit = income - expenses;

  // P&L by category
  const revenueByCategory = Object.entries(
    periodTxns.filter(t => t.type === "income").reduce((acc, t) => {
      const cat = t.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + (t.amount || 0);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const expenseByCategory = Object.entries(
    periodTxns.filter(t => t.type === "expense").reduce((acc, t) => {
      const cat = t.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + (t.amount || 0);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Financial Reports</h1>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="pl">
          <TabsList>
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="pl" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Profit & Loss Statement</CardTitle>
                <p className="text-xs text-slate-400">{format(start, "MMM d, yyyy")} – {format(end, "MMM d, yyyy")}</p>
              </CardHeader>
              <CardContent className="space-y-0">
                {/* Revenue */}
                <div className="py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Revenue</p>
                  {revenueByCategory.length === 0 ? (
                    <p className="text-sm text-slate-400 pl-2">No revenue recorded</p>
                  ) : (
                    revenueByCategory.map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between py-1 pl-3">
                        <span className="text-sm text-slate-700">{cat}</span>
                        <span className="text-sm font-medium text-green-700">{fmt(amt)}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-100 mt-1">
                    <span className="text-sm font-semibold text-slate-800">Total Revenue</span>
                    <span className="text-sm font-bold text-green-700">{fmt(income)}</span>
                  </div>
                </div>

                {/* Expenses */}
                <div className="py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expenses</p>
                  {expenseByCategory.length === 0 ? (
                    <p className="text-sm text-slate-400 pl-2">No expenses recorded</p>
                  ) : (
                    expenseByCategory.map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between py-1 pl-3">
                        <span className="text-sm text-slate-700">{cat}</span>
                        <span className="text-sm font-medium text-red-700">{fmt(amt)}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-100 mt-1">
                    <span className="text-sm font-semibold text-slate-800">Total Expenses</span>
                    <span className="text-sm font-bold text-red-700">{fmt(expenses)}</span>
                  </div>
                </div>

                {/* Net */}
                <div className="py-4 flex justify-between items-center">
                  <span className="text-base font-bold text-slate-900">Net Profit</span>
                  <span className={`text-xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(netProfit)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Total Revenue", value: fmt(income), color: "text-green-700" },
                { label: "Total Expenses", value: fmt(expenses), color: "text-red-700" },
                { label: "Net Profit", value: fmt(netProfit), color: netProfit >= 0 ? "text-green-700" : "text-red-700" },
                { label: "Profit Margin", value: income > 0 ? `${((netProfit / income) * 100).toFixed(1)}%` : "—", color: "text-indigo-700" },
                { label: "Transactions", value: String(periodTxns.length), color: "text-slate-700" },
                { label: "Avg Transaction", value: periodTxns.length > 0 ? fmt((income + expenses) / periodTxns.length) : "—", color: "text-slate-700" },
              ].map(({ label, value, color }) => (
                <Card key={label} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AccountingLayout>
  );
}