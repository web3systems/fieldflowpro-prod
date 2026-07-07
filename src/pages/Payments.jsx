import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  CreditCard, DollarSign, CheckCircle, Clock, AlertCircle,
  Search, Filter, ChevronRight, Banknote, Landmark, Wallet,
  ArrowUpDown, CalendarDays, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

const METHOD_LABELS = {
  cash: "Cash",
  check: "Check",
  card: "Card",
  stripe: "Stripe",
  venmo: "Venmo",
  zelle: "Zelle",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

const METHOD_COLORS = {
  cash: "bg-green-100 text-green-700",
  check: "bg-blue-100 text-blue-700",
  card: "bg-violet-100 text-violet-700",
  stripe: "bg-violet-100 text-violet-700",
  venmo: "bg-sky-100 text-sky-700",
  zelle: "bg-purple-100 text-purple-700",
  bank_transfer: "bg-slate-100 text-slate-700",
  other: "bg-slate-100 text-slate-700",
};

const TYPE_LABELS = { deposit: "Deposit", partial: "Partial", final: "Final" };

export default function Payments() {
  const { activeCompany } = useApp();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortDir, setSortDir] = useState("desc");

  // Stripe collect section
  const [showStripe, setShowStripe] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_success") === "true") {
      const invoiceId = params.get("invoice_id");
      if (invoiceId) {
        base44.entities.Invoice.update(invoiceId, { status: "paid", paid_date: new Date().toISOString().split("T")[0] })
          .then(() => { if (activeCompany) loadData(); });
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [pmts, inv, j, c] = await Promise.all([
      base44.entities.Payment.filter({ company_id: activeCompany.id }),
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
    ]);
    setPayments(pmts);
    setInvoices(inv);
    setJobs(j);
    setCustomers(c);
    setLoading(false);
  }

  const getCustomerName = (id) => {
    const c = customers.find(c => c.id === id);
    return c ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.business_name || "—" : "—";
  };
  const getInvoice = (id) => invoices.find(i => i.id === id);
  const getJob = (id) => jobs.find(j => j.id === id);
  const getCustomerForPayment = (pmt) => {
    const inv = getInvoice(pmt.invoice_id);
    if (inv) return getCustomerName(inv.customer_id);
    const job = getJob(pmt.job_id);
    if (job) return getCustomerName(job.customer_id);
    return "—";
  };

  // Date range helper
  const dateRangeFilter = useMemo(() => {
    const now = new Date();
    if (dateFilter === "7d") return subDays(now, 7);
    if (dateFilter === "30d") return subDays(now, 30);
    if (dateFilter === "month") return startOfMonth(now);
    return null;
  }, [dateFilter]);

  const filtered = useMemo(() => {
    let list = [...payments];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => {
        const customerName = getCustomerForPayment(p).toLowerCase();
        const inv = getInvoice(p.invoice_id);
        const job = getJob(p.job_id);
        return (
          customerName.includes(q) ||
          inv?.invoice_number?.toLowerCase().includes(q) ||
          job?.title?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q)
        );
      });
    }

    if (methodFilter !== "all") {
      list = list.filter(p => p.payment_method === methodFilter);
    }

    if (dateRangeFilter) {
      list = list.filter(p => {
        if (!p.received_date) return false;
        return new Date(p.received_date + "T00:00:00") >= dateRangeFilter;
      });
    }

    list.sort((a, b) => {
      const da = new Date(a.received_date + "T00:00:00");
      const db = new Date(b.received_date + "T00:00:00");
      return sortDir === "desc" ? db - da : da - db;
    });

    return list;
  }, [payments, search, methodFilter, dateRangeFilter, sortDir, customers, invoices, jobs]);

  // Summary stats from ledger
  const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const thisMonthTotal = payments
    .filter(p => p.received_date && new Date(p.received_date + "T00:00:00") >= startOfMonth(new Date()))
    .reduce((s, p) => s + (p.amount || 0), 0);
  const methodBreakdown = payments.reduce((acc, p) => {
    const m = p.payment_method || "other";
    acc[m] = (acc[m] || 0) + (p.amount || 0);
    return acc;
  }, {});
  const topMethod = Object.entries(methodBreakdown).sort((a, b) => b[1] - a[1])[0];

  // Stripe collect — outstanding invoices
  const unpaidInvoices = invoices.filter(i => ["sent", "viewed", "overdue", "partial"].includes(i.status));

  async function collectPayment(invoice) {
    const isInIframe = window.self !== window.top;
    if (isInIframe) { alert("Payment checkout only works from the published app, not from the preview."); return; }
    setPaymentLoading(invoice.id);
    const currentUrl = window.location.origin + createPageUrl("Payments");
    const response = await base44.functions.invoke("createStripeCheckout", {
      invoice_id: invoice.id, success_url: currentUrl, cancel_url: currentUrl,
    });
    setPaymentLoading(null);
    if (response.data?.url) window.location.href = response.data.url;
    else alert(response.data?.error || "Failed to create payment session.");
  }

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Ledger</h1>
          <p className="text-slate-500 text-sm mt-0.5">All payments received — cash, check, card, Stripe, and more</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-violet-700 border-violet-200 hover:bg-violet-50"
          onClick={() => setShowStripe(s => !s)}
        >
          <CreditCard className="w-4 h-4" />
          {showStripe ? "Hide Stripe Tools" : "Collect via Stripe"}
        </Button>
      </div>

      {/* Stripe Collect Panel (collapsible) */}
      {showStripe && (
        <Card className="border border-violet-200 bg-violet-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-violet-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Collect Payment via Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unpaidInvoices.length === 0 ? (
              <p className="text-sm text-slate-500">No outstanding invoices.</p>
            ) : (
              <div className="space-y-2">
                {unpaidInvoices.map(inv => {
                  const amountDue = (inv.total || 0) - (inv.amount_paid || 0);
                  return (
                    <div key={inv.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-violet-100">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-800 text-sm">{getCustomerName(inv.customer_id)}</span>
                        <span className="text-xs text-slate-400 ml-2">{inv.invoice_number}</span>
                        {inv.status === "overdue" && <Badge className="ml-2 text-xs bg-red-100 text-red-700">Overdue</Badge>}
                      </div>
                      <span className="text-sm font-bold text-slate-700">${amountDue.toFixed(2)}</span>
                      <Button size="sm" onClick={() => collectPayment(inv)} disabled={paymentLoading === inv.id}
                        className="bg-violet-600 hover:bg-violet-700 text-xs gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        {paymentLoading === inv.id ? "..." : "Send Link"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">All Time Collected</p>
              <p className="text-2xl font-bold text-green-700">${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-green-500">{payments.length} payments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">This Month</p>
              <p className="text-2xl font-bold text-blue-700">${thisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-blue-500">{format(new Date(), "MMMM yyyy")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Top Method</p>
              <p className="text-2xl font-bold text-slate-700">{topMethod ? METHOD_LABELS[topMethod[0]] || topMethod[0] : "—"}</p>
              <p className="text-xs text-slate-400">{topMethod ? `$${topMethod[1].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "No payments yet"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Customer, invoice, job..." className="pl-9 bg-white h-9 text-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-36 h-9 bg-white text-sm">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {Object.entries(METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-36 h-9 bg-white text-sm">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortDir === "desc" ? "Newest First" : "Oldest First"}
        </Button>
      </div>

      {/* Payment List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No payments found</p>
            <p className="text-slate-400 text-sm mt-1">
              {payments.length === 0
                ? "Record payments from a job or invoice to see them here."
                : "Try adjusting your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(pmt => {
              const inv = getInvoice(pmt.invoice_id);
              const job = getJob(pmt.job_id);
              const customerName = getCustomerForPayment(pmt);
              const methodColor = METHOD_COLORS[pmt.payment_method] || "bg-slate-100 text-slate-700";
              return (
                <div key={pmt.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 text-sm">{customerName}</span>
                      {pmt.payment_type && (
                        <span className="text-xs text-slate-400">{TYPE_LABELS[pmt.payment_type] || pmt.payment_type}</span>
                      )}
                      <Badge className={`text-xs px-1.5 py-0 ${methodColor}`}>
                        {METHOD_LABELS[pmt.payment_method] || pmt.payment_method || "Other"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400">
                        {pmt.received_date ? format(new Date(pmt.received_date + "T00:00:00"), "MMM d, yyyy") : "No date"}
                      </span>
                      {inv && (
                        <Link to={`/InvoiceDetail/${inv.id}`} className="text-xs text-blue-500 hover:underline">
                          {inv.invoice_number || "Invoice"}
                        </Link>
                      )}
                      {job && (
                        <Link to={`/JobDetail/${job.id}`} className="text-xs text-blue-500 hover:underline">
                          {job.title}
                        </Link>
                      )}
                      {pmt.notes && <span className="text-xs text-slate-400 italic truncate max-w-[200px]">{pmt.notes}</span>}
                    </div>
                  </div>
                  <p className="text-base font-bold text-green-700 flex-shrink-0">
                    ${(pmt.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-500">{filtered.length} payment{filtered.length !== 1 ? "s" : ""}</span>
            <span className="text-sm font-bold text-slate-700">
              Total: ${filtered.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}