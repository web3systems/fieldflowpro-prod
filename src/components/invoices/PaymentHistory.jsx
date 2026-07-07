import { format } from "date-fns";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const METHOD_LABELS = {
  cash: "Cash", check: "Check", card: "Card", stripe: "Stripe (online)",
  venmo: "Venmo", zelle: "Zelle", bank_transfer: "Bank Transfer", other: "Other",
};

const TYPE_STYLES = {
  deposit: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700",
  final: "bg-green-100 text-green-700",
};

export default function PaymentHistory({ payments, invoiceTotal }) {
  const sorted = [...payments].sort((a, b) => new Date(a.received_date) - new Date(b.received_date));
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balance = Math.max(0, (invoiceTotal || 0) - totalPaid);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-500" /> Payment History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-50">
          {sorted.map(p => (
            <div key={p.id} className="flex items-center justify-between px-6 py-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">${(p.amount || 0).toFixed(2)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${TYPE_STYLES[p.payment_type] || "bg-slate-100 text-slate-600"}`}>
                    {p.payment_type || "payment"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {METHOD_LABELS[p.payment_method] || p.payment_method || "Unknown method"}
                  {p.received_date ? ` · ${format(new Date(p.received_date), "MMM d, yyyy")}` : ""}
                  {p.notes ? ` · ${p.notes}` : ""}
                </p>
                {p.recorded_by && <p className="text-xs text-slate-400">Recorded by {p.recorded_by}</p>}
              </div>
              <span className="text-green-600 font-semibold text-sm">${(p.amount || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className={`mx-6 mb-4 mt-2 p-3 rounded-lg flex justify-between text-sm font-semibold border ${balance > 0 ? "bg-red-50 border-red-100 text-red-700" : "bg-green-50 border-green-100 text-green-700"}`}>
          <span>{balance > 0 ? "Balance Due" : "Paid in Full"}</span>
          <span>{balance > 0 ? `$${balance.toFixed(2)}` : `✓ $${totalPaid.toFixed(2)}`}</span>
        </div>
      </CardContent>
    </Card>
  );
}