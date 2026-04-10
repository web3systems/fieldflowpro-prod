import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function JobCostingSection({ form }) {
  const [expanded, setExpanded] = useState(false);

  const lineItems = form.line_items || [];
  const serviceTotal = lineItems.filter(i => i.category !== "material").reduce((s, i) => s + (i.total || 0), 0);
  const materialTotal = lineItems.filter(i => i.category === "material").reduce((s, i) => s + (i.total || 0), 0);
  const totalRevenue = form.total_amount || 0;
  const totalJobCost = serviceTotal + materialTotal;
  const grossProfit = totalRevenue - totalJobCost;
  const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  const revenueData = [
    { name: "Total gross profit", value: Math.max(0, grossProfit), color: "#22c55e" },
    { name: "Total job costs", value: totalJobCost, color: "#ef4444" },
  ];

  const costData = [
    { name: "Services", value: serviceTotal, color: "#94a3b8" },
    { name: "Materials", value: materialTotal, color: "#cbd5e1" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-slate-800">Job costing breakdown</h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          {/* Summary row */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Actual costs</p>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-slate-500">Profit margin</p>
              <p className="text-lg font-bold text-slate-900">{profitMargin}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total revenue</p>
              <p className="text-lg font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Total job costs</p>
              <p className="text-lg font-bold text-slate-900">${totalJobCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Gross profit</p>
              <p className="text-lg font-bold text-slate-900">${Math.max(0, grossProfit).toFixed(2)}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Revenue breakdown */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Total revenue breakdown</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={revenueData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                      {revenueData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {revenueData.map(d => (
                    <div key={d.name}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-slate-600">{d.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 ml-4">${d.value.toFixed(2)}</p>
                      <p className="text-xs text-slate-400 ml-4">{totalRevenue > 0 ? Math.round((d.value / totalRevenue) * 100) : 0}% of total revenue</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cost breakdown */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Total job cost breakdown</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={costData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                      {costData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {costData.map(d => (
                    <div key={d.name}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-slate-600">{d.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 ml-4">${d.value.toFixed(2)}</p>
                      <p className="text-xs text-slate-400 ml-4">{totalJobCost > 0 ? Math.round((d.value / totalJobCost) * 100) : 0}% of total job cost</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}