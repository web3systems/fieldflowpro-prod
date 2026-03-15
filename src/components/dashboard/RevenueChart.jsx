import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { TrendingUp } from "lucide-react";

export default function RevenueChart({ invoices }) {
  const data = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const revenue = invoices
      .filter(inv => inv.status === "paid")
      .filter(inv => {
        const d = new Date(inv.paid_date || inv.updated_date || inv.created_date);
        return d >= start && d <= end;
      })
      .reduce((s, inv) => s + (inv.total || 0), 0);
    return { month: format(date, "MMM"), revenue };
  });

  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Revenue — Last 6 Months
          </CardTitle>
          <span className="text-sm font-bold text-slate-700">${total.toLocaleString()} total</span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
              formatter={v => [`$${v.toLocaleString()}`, "Revenue"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}