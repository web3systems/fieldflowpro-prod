import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import AccountingLayout from "../components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, Download, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

export default function AccountingReports() {
  const { activeCompany } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [chartAccounts, setChartAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState("this_month");

  useEffect(() => { if (activeCompany) loadData(); }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [txns, banks, accts] = await Promise.all([
      base44.entities.AccountingTransaction.filter({ company_id: activeCompany.id }),
      base44.entities.BankAccount.filter({ company_id: activeCompany.id }),
      base44.entities.ChartOfAccount.filter({ company_id: activeCompany.id }),
    ]);
    setTransactions(txns);
    setBankAccounts(banks);
    setChartAccounts(accts);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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

  const allTxns = transactions; // for balance sheet (cumulative)

  // --- P&L ---
  const income = periodTxns.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = periodTxns.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const netProfit = income - expenses;

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

  // --- Balance Sheet ---
  const totalBankBalance = bankAccounts.filter(a => a.is_active).reduce((s, a) => s + (a.current_balance || 0), 0);
  const totalIncomeAllTime = allTxns.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpensesAllTime = allTxns.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const retainedEarnings = totalIncomeAllTime - totalExpensesAllTime;

  const assetAccounts = chartAccounts.filter(a => a.type === "asset" && a.is_active);
  const liabilityAccounts = chartAccounts.filter(a => a.type === "liability" && a.is_active);
  const equityAccounts = chartAccounts.filter(a => a.type === "equity" && a.is_active);

  // Aggregate asset transactions by account
  function getAccountBalance(accountName, type) {
    return allTxns.filter(t => t.category === accountName || t.account_name === accountName)
      .reduce((s, t) => s + (t.type === "income" ? (t.amount || 0) : -(t.amount || 0)), 0);
  }

  const totalAssets = totalBankBalance + Math.max(0, totalIncomeAllTime - totalExpensesAllTime);
  const totalLiabilities = 0; // simplified - could pull from liability transactions
  const totalEquity = totalAssets - totalLiabilities;

  // --- Cash Flow ---
  const operatingCashFlow = income - expenses;
  const investingCashFlow = periodTxns.filter(t => t.type === "expense" && (t.category || "").toLowerCase().includes("equipment"))
    .reduce((s, t) => s + (t.amount || 0), 0);
  const financingCashFlow = 0; // owner draws/contributions

  const netCashFlow = operatingCashFlow - investingCashFlow + financingCashFlow;
  const beginningCash = totalBankBalance - netCashFlow;
  const endingCash = totalBankBalance;

  // --- Trial Balance ---
  const trialBalance = chartAccounts.filter(a => a.is_active).map(acct => {
    const acctTxns = allTxns.filter(t => t.account_name === acct.name || t.category === acct.name);
    const debitTotal = acctTxns.filter(t => t.type === "expense" || t.type === "asset")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const creditTotal = acctTxns.filter(t => t.type === "income" || t.type === "liability" || t.type === "equity")
      .reduce((s, t) => s + (t.amount || 0), 0);

    if (acct.type === "revenue") {
      const rev = allTxns.filter(t => t.type === "income" && (t.category === acct.name || t.account_name === acct.name))
        .reduce((s, t) => s + (t.amount || 0), 0);
      return { ...acct, debit: 0, credit: rev };
    }
    if (acct.type === "expense") {
      const exp = allTxns.filter(t => t.type === "expense" && (t.category === acct.name || t.account_name === acct.name))
        .reduce((s, t) => s + (t.amount || 0), 0);
      return { ...acct, debit: exp, credit: 0 };
    }
    return { ...acct, debit: debitTotal, credit: creditTotal };
  });

  const totalTrialDebit = trialBalance.reduce((s, a) => s + a.debit, 0);
  const totalTrialCredit = trialBalance.reduce((s, a) => s + a.credit, 0);

  // --- Export ---
  function exportCSV(data, filename) {
    const header = Object.keys(data[0] || {}).join(",");
    const rows = data.map(row => Object.values(row).map(v => `"${v ?? ""}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPL() {
    const data = [];
    revenueByCategory.forEach(([cat, amt]) => data.push({ section: "Revenue", category: cat, amount: amt }));
    data.push({ section: "Revenue", category: "TOTAL REVENUE", amount: income });
    expenseByCategory.forEach(([cat, amt]) => data.push({ section: "Expense", category: cat, amount: amt }));
    data.push({ section: "Expense", category: "TOTAL EXPENSES", amount: expenses });
    data.push({ section: "Result", category: "NET PROFIT", amount: netProfit });
    exportCSV(data, `pnl_${activeCompany?.name}_${format(new Date(), "yyyy-MM-dd")}.csv`);
  }

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Financial Reports</h1>
          <div className="flex items-center gap-2">
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
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm" className="gap-1">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <Tabs defaultValue="pl">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
              <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
              <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
              <TabsTrigger value="trial">Trial Balance</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* ─── P&L ─── */}
            <TabsContent value="pl" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Profit & Loss Statement</CardTitle>
                    <p className="text-xs text-slate-400">{format(start, "MMM d, yyyy")} – {format(end, "MMM d, yyyy")}</p>
                  </div>
                  <Button onClick={exportPL} variant="ghost" size="sm" className="gap-1 text-slate-500">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-0">
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
                  <div className="py-4 flex justify-between items-center">
                    <span className="text-base font-bold text-slate-900">Net Profit</span>
                    <span className={`text-xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(netProfit)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Balance Sheet ─── */}
            <TabsContent value="balance" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Balance Sheet</CardTitle>
                    <p className="text-xs text-slate-400">As of {format(end, "MMM d, yyyy")}</p>
                  </div>
                  <Button onClick={() => {
                    const data = [
                      { section: "ASSETS", item: "Bank Accounts", amount: totalBankBalance },
                      { section: "ASSETS", item: "Accounts Receivable", amount: Math.max(0, retainedEarnings) },
                      { section: "ASSETS", item: "TOTAL ASSETS", amount: totalAssets },
                      { section: "LIABILITIES & EQUITY", item: "Retained Earnings", amount: retainedEarnings },
                      { section: "LIABILITIES & EQUITY", item: "TOTAL LIABILITIES & EQUITY", amount: totalAssets },
                    ];
                    exportCSV(data, `balance_sheet_${activeCompany?.name}_${format(new Date(), "yyyy-MM-dd")}.csv`);
                  }} variant="ghost" size="sm" className="gap-1 text-slate-500">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-0">
                  {/* Assets */}
                  <div className="py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assets</p>
                    <div className="flex justify-between py-1 pl-3">
                      <span className="text-sm text-slate-700">Cash & Bank Accounts</span>
                      <span className="text-sm font-medium text-green-700">{fmt(totalBankBalance)}</span>
                    </div>
                    {retainedEarnings > 0 && (
                      <div className="flex justify-between py-1 pl-3">
                        <span className="text-sm text-slate-700">Accounts Receivable</span>
                        <span className="text-sm font-medium text-green-700">{fmt(retainedEarnings)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-100 mt-1">
                      <span className="text-sm font-semibold text-slate-800">Total Assets</span>
                      <span className="text-sm font-bold text-green-700">{fmt(totalAssets)}</span>
                    </div>
                  </div>
                  {/* Liabilities & Equity */}
                  <div className="py-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Liabilities & Equity</p>
                    <div className="flex justify-between py-1 pl-3">
                      <span className="text-sm text-slate-700">Retained Earnings</span>
                      <span className="text-sm font-medium text-indigo-700">{fmt(retainedEarnings)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100 mt-1">
                      <span className="text-sm font-semibold text-slate-800">Total Liabilities & Equity</span>
                      <span className="text-sm font-bold text-indigo-700">{fmt(totalAssets)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Cash Flow ─── */}
            <TabsContent value="cashflow" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Cash Flow Statement</CardTitle>
                    <p className="text-xs text-slate-400">{format(start, "MMM d, yyyy")} – {format(end, "MMM d, yyyy")}</p>
                  </div>
                  <Button onClick={() => {
                    const data = [
                      { section: "Operating", item: "Net Income", amount: netProfit },
                      { section: "Operating", item: "NET OPERATING CASH", amount: operatingCashFlow },
                      { section: "Investing", item: "Equipment Purchases", amount: -investingCashFlow },
                      { section: "Investing", item: "NET INVESTING CASH", amount: -investingCashFlow },
                      { section: "Financing", item: "NET FINANCING CASH", amount: financingCashFlow },
                      { section: "Summary", item: "NET CASH CHANGE", amount: netCashFlow },
                      { section: "Summary", item: "BEGINNING CASH", amount: beginningCash },
                      { section: "Summary", item: "ENDING CASH", amount: endingCash },
                    ];
                    exportCSV(data, `cashflow_${activeCompany?.name}_${format(new Date(), "yyyy-MM-dd")}.csv`);
                  }} variant="ghost" size="sm" className="gap-1 text-slate-500">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-0">
                  {/* Operating */}
                  <div className="py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Operating Activities</p>
                    <div className="flex justify-between py-1 pl-3">
                      <span className="text-sm text-slate-700">Net Income</span>
                      <span className={`text-sm font-medium ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(netProfit)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100 mt-1">
                      <span className="text-sm font-semibold text-slate-800">Net Cash from Operations</span>
                      <span className={`text-sm font-bold ${operatingCashFlow >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(operatingCashFlow)}</span>
                    </div>
                  </div>
                  {/* Investing */}
                  <div className="py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Investing Activities</p>
                    {investingCashFlow > 0 ? (
                      <div className="flex justify-between py-1 pl-3">
                        <span className="text-sm text-slate-700">Equipment Purchases</span>
                        <span className="text-sm font-medium text-red-700">-{fmt(investingCashFlow)}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 pl-2">No investing activity</p>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-100 mt-1">
                      <span className="text-sm font-semibold text-slate-800">Net Cash from Investing</span>
                      <span className="text-sm font-bold text-red-700">-{fmt(investingCashFlow)}</span>
                    </div>
                  </div>
                  {/* Financing */}
                  <div className="py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Financing Activities</p>
                    <p className="text-sm text-slate-400 pl-2">No financing activity recorded</p>
                  </div>
                  {/* Summary */}
                  <div className="py-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-slate-800">Net Change in Cash</span>
                      <span className={`text-sm font-bold ${netCashFlow >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(netCashFlow)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Cash at Beginning</span>
                      <span className="text-sm text-slate-700">{fmt(beginningCash)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-bold text-slate-800">Cash at End</span>
                      <span className="text-sm font-bold text-green-700">{fmt(endingCash)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Trial Balance ─── */}
            <TabsContent value="trial" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Trial Balance</CardTitle>
                    <p className="text-xs text-slate-400">All accounts — {format(end, "MMM d, yyyy")}</p>
                  </div>
                  <Button onClick={() => {
                    exportCSV(trialBalance.map(a => ({
                      code: a.code, name: a.name, type: a.type,
                      debit: a.debit.toFixed(2), credit: a.credit.toFixed(2)
                    })), `trial_balance_${activeCompany?.name}_${format(new Date(), "yyyy-MM-dd")}.csv`);
                  }} variant="ghost" size="sm" className="gap-1 text-slate-500">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {trialBalance.length === 0 ? (
                    <p className="text-sm text-slate-400 p-4 text-center">No chart of accounts set up yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      <div className="flex items-center px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                        <span className="w-16 shrink-0">Code</span>
                        <span className="flex-1">Account</span>
                        <span className="w-20 shrink-0 text-right">Debit</span>
                        <span className="w-20 shrink-0 text-right">Credit</span>
                      </div>
                      {trialBalance.map(acct => (
                        <div key={acct.id} className="flex items-center px-4 py-2 text-sm">
                          <span className="w-16 shrink-0 text-xs text-slate-400 font-mono">{acct.code}</span>
                          <span className="flex-1 text-slate-700">{acct.name}</span>
                          <span className="w-20 shrink-0 text-right text-slate-700">{acct.debit > 0 ? fmt(acct.debit) : "—"}</span>
                          <span className="w-20 shrink-0 text-right text-slate-700">{acct.credit > 0 ? fmt(acct.credit) : "—"}</span>
                        </div>
                      ))}
                      <div className="flex items-center px-4 py-3 bg-slate-50 font-semibold">
                        <span className="w-16 shrink-0" />
                        <span className="flex-1 text-slate-800">Totals</span>
                        <span className="w-20 shrink-0 text-right text-slate-800">{fmt(totalTrialDebit)}</span>
                        <span className="w-20 shrink-0 text-right text-slate-800">{fmt(totalTrialCredit)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Summary ─── */}
            <TabsContent value="summary" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Total Revenue", value: fmt(income), color: "text-green-700" },
                  { label: "Total Expenses", value: fmt(expenses), color: "text-red-700" },
                  { label: "Net Profit", value: fmt(netProfit), color: netProfit >= 0 ? "text-green-700" : "text-red-700" },
                  { label: "Profit Margin", value: income > 0 ? `${((netProfit / income) * 100).toFixed(1)}%` : "—", color: "text-indigo-700" },
                  { label: "Transactions", value: String(periodTxns.length), color: "text-slate-700" },
                  { label: "Avg Transaction", value: periodTxns.length > 0 ? fmt((income + expenses) / periodTxns.length) : "—", color: "text-slate-700" },
                  { label: "Bank Balance", value: fmt(totalBankBalance), color: "text-emerald-700" },
                  { label: "Retained Earnings", value: fmt(retainedEarnings), color: retainedEarnings >= 0 ? "text-indigo-700" : "text-red-700" },
                  { label: "Net Cash Flow", value: fmt(netCashFlow), color: netCashFlow >= 0 ? "text-green-700" : "text-red-700" },
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
        )}
      </div>
    </AccountingLayout>
  );
}