import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { createPageUrl } from "@/utils";
import {
  CreditCard, DollarSign, CheckCircle, Clock, AlertCircle,
  TrendingUp, Download, Search, ChevronRight, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function Payments() {
  const { activeCompany } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(null);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  useEffect(() => {
    // Handle return from Stripe
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
    const [inv, c] = await Promise.all([
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
    ]);
    setInvoices(inv);
    setCustomers(c);
    setLoading(false);
  }

  async function collectPayment(invoice) {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      alert("Payment checkout only works from the published app, not from the preview.");
      return;
    }
    setPaymentLoading(invoice.id);
    const currentUrl = window.location.origin + createPageUrl("Payments");
    const response = await base44.functions.invoke("createStripeCheckout", {
      invoice_id: invoice.id,
      success_url: currentUrl,
      cancel_url: currentUrl,
    });
    setPaymentLoading(null);
    if (response.data?.url) {
      window.location.href = response.data.url;
    } else {
      alert(response.data?.error || "Failed to create payment session.");
    }
  }

  async function markPaid(invoice) {
    await base44.entities.Invoice.update(invoice.id, {
      status: "paid",
      paid_date: new Date().toISOString().split("T")[0],
      amount_paid: invoice.total,
    });
    await loadData();
  }

  const getCustomerName = (id) => {
    const c = customers.find(c => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  const paidInvoices = invoices.filter(i => i.status === "paid");
  const unpaidInvoices = invoices.filter(i => ["sent", "viewed", "overdue", "partial"].includes(i.status));
  const totalCollected = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalOutstanding = unpaidInvoices.reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);
  const overdueCount = invoices.filter(i => i.status === "overdue").length;

  const filteredUnpaid = unpaidInvoices.filter(inv => {
    if (!search) return true;
    const name = getCustomerName(inv.customer_id).toLowerCase();
    return name.includes(search.toLowerCase()) || inv.invoice_number?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-500 text-sm mt-0.5">Collect and track payments from customers</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Total Collected</p>
                <p className="text-2xl font-bold text-green-700">${totalCollected.toLocaleString()}</p>
                <p className="text-xs text-green-500">{paidInvoices.length} invoices paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Outstanding</p>
                <p className="text-2xl font-bold text-amber-700">${totalOutstanding.toLocaleString()}</p>
                <p className="text-xs text-amber-500">{unpaidInvoices.length} invoices pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-700">{overdueCount}</p>
                <p className="text-xs text-red-500">invoices past due date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Collect Payment</h2>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-white h-8 text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : filteredUnpaid.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="p-10 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">All payments collected!</p>
              <p className="text-slate-400 text-sm mt-1">No outstanding invoices at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUnpaid.map(inv => {
              const amountDue = (inv.total || 0) - (inv.amount_paid || 0);
              const isOverdue = inv.status === "overdue";
              return (
                <Card key={inv.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800">{getCustomerName(inv.customer_id)}</span>
                          <span className="text-xs font-mono text-slate-400">{inv.invoice_number}</span>
                          {isOverdue && <Badge className="text-xs bg-red-100 text-red-700">Overdue</Badge>}
                          {inv.status === "partial" && <Badge className="text-xs bg-amber-100 text-amber-700">Partial</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {inv.due_date && (
                            <span className={`text-xs ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                              Due {format(new Date(inv.due_date), "MMM d, yyyy")}
                            </span>
                          )}
                          {inv.amount_paid > 0 && (
                            <span className="text-xs text-slate-400">${inv.amount_paid} already paid</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-slate-800">${amountDue.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">due</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => collectPayment(inv)}
                          disabled={paymentLoading === inv.id}
                          className="bg-violet-600 hover:bg-violet-700 gap-1.5 text-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          {paymentLoading === inv.id ? "..." : "Stripe"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markPaid(inv)}
                          className="gap-1.5 text-xs border-green-200 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Payment History</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : paidInvoices.length === 0 ? (
          <p className="text-slate-400 text-sm">No payments recorded yet.</p>
        ) : (
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {paidInvoices.slice().reverse().map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{getCustomerName(inv.customer_id)}</p>
                    <p className="text-xs text-slate-400">
                      {inv.invoice_number} · {inv.paid_date ? format(new Date(inv.paid_date), "MMM d, yyyy") : "Date unknown"}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-green-700 flex-shrink-0">${(inv.total || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}