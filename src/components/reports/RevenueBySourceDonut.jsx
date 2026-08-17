import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#ea580c", "#16a34a", "#db2777", "#ca8a04", "#475569"];

// Revenue by Lead Source donut chart.
export default function RevenueBySourceDonut({ leads, customers, invoices }) {
  // Map customer_id → lead source (from the customer's source field or linked lead)
  const customerSource = {};
  customers.forEach(c => { customerSource[c.id] = c.source || "manual"; });
  leads.forEach(l => {
    // If a lead was won, try to match by name/email to a customer
    if (l.status === "won") {
      const match = customers.find(c =>
        (c.email && l.email && c.email === l.email) ||
        (c.first_name === l.first_name && c.last_name === l.last_name)
      );
      if (match) customerSource[match.id] = l.source || match.source || "other";
    }
  });

  const bySource = {};
  invoices.filter(i => i.status === "paid" || i.status === "partial").forEach(i => {
    const src = customerSource[i.customer_id] || "other";
    const amt = i.amount_paid > 0 ? i.amount_paid : (i.total || 0);
    bySource[src] = (bySource[src] || 0) + amt;
  });

  const data = Object.entries(bySource)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Revenue by Lead Source</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-slate-400 py-8 text-center">No paid revenue linked to lead sources yet.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-base">Revenue by Lead Source</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-400 text-center mt-1">Total: ${total.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}