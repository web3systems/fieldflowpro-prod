import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Tag } from "lucide-react";

// Right-side panel: Overview (lifetime value, current balance), Tags, Notes.
export default function CustomerSummaryPanel({ customer, invoices }) {
  const lifetimeValue = invoices
    .filter(i => i.status === "paid" || i.status === "partial")
    .reduce((s, i) => s + (i.amount_paid > 0 ? i.amount_paid : (i.total || 0)), 0);
  const currentBalance = invoices
    .filter(i => ["sent", "viewed", "overdue", "partial"].includes(i.status))
    .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);

  const tags = customer.tags || [];

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-slate-800">Overview</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500">Lifetime Value</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">${lifetimeValue.toLocaleString()}</p>
            </div>
          </div>
          <div className="border-t border-slate-100" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500">Current Balance</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">${currentBalance.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" /> Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-xs text-slate-400">No tags yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t, i) => (
                <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700">{t}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-slate-800">Notes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">
            {customer.notes || <span className="text-slate-400">No notes yet.</span>}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}