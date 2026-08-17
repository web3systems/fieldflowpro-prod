import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

// Revenue heatmap by location — a simple regional breakdown by job city/state.
// Intensity scales with revenue share so higher-revenue regions render darker.
export default function RevenueHeatmap({ jobs, invoices }) {
  // Build job_id → revenue from paid invoices linked to jobs
  const jobRevenue = {};
  invoices.filter(i => i.status === "paid" || i.status === "partial").forEach(i => {
    if (i.job_id) jobRevenue[i.job_id] = (jobRevenue[i.job_id] || 0) + (i.amount_paid > 0 ? i.amount_paid : (i.total || 0));
  });

  const byRegion = {};
  jobs.forEach(j => {
    const region = j.city && j.state ? `${j.city}, ${j.state}` : (j.state || j.city || "Unknown");
    byRegion[region] = (byRegion[region] || 0) + (jobRevenue[j.id] || 0) + (j.total_amount || 0);
  });

  const data = Object.entries(byRegion)
    .map(([region, value]) => ({ region, value }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const max = data.length > 0 ? data[0].value : 1;

  if (data.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Revenue by Location</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-slate-400 py-8 text-center">Add city/state to jobs to see revenue by location.</p></CardContent>
      </Card>
    );
  }

  // Blue intensity scale — higher revenue = darker blue
  const intensity = (val) => {
    const ratio = val / max;
    if (ratio > 0.75) return "bg-blue-700 text-white";
    if (ratio > 0.5) return "bg-blue-500 text-white";
    if (ratio > 0.25) return "bg-blue-300 text-blue-900";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" /> Revenue by Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map(d => (
          <div key={d.region} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${intensity(d.value)} transition-colors`}>
            <span className="text-sm font-medium truncate flex-1">{d.region}</span>
            <span className="text-sm font-bold ml-2">${d.value.toLocaleString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}