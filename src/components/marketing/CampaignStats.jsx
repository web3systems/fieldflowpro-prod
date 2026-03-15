import { Card, CardContent } from "@/components/ui/card";
import { Send, Users, MailOpen, MousePointer } from "lucide-react";

export default function CampaignStats({ campaigns }) {
  const sent = campaigns.filter(c => c.status === "sent");
  const totalSent = sent.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalOpens = sent.reduce((s, c) => s + (c.open_count || 0), 0);
  const totalClicks = sent.reduce((s, c) => s + (c.click_count || 0), 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;

  const stats = [
    { label: "Campaigns Sent", value: sent.length, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Recipients", value: totalSent.toLocaleString(), icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Opens", value: totalOpens.toLocaleString(), icon: MailOpen, color: "text-green-600", bg: "bg-green-50" },
    { label: "Avg Open Rate", value: `${avgOpenRate}%`, icon: MousePointer, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}