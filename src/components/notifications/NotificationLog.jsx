import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { format } from "date-fns";

const TYPE_COLORS = {
  new_job_assigned: "bg-blue-100 text-blue-700",
  job_status_change: "bg-purple-100 text-purple-700",
  job_reminder: "bg-indigo-100 text-indigo-700",
  new_booking: "bg-green-100 text-green-700",
  new_lead: "bg-yellow-100 text-yellow-700",
  new_customer: "bg-teal-100 text-teal-700",
  invoice_paid: "bg-emerald-100 text-emerald-700",
  invoice_overdue: "bg-red-100 text-red-700",
  payment_received: "bg-lime-100 text-lime-700",
  estimate_approved: "bg-cyan-100 text-cyan-700",
  system: "bg-slate-100 text-slate-600",
};

export default function NotificationLog({ user, company }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email || !company?.id) return;
    load();
  }, [user?.email, company?.id]);

  async function load() {
    setLoading(true);
    const list = await base44.entities.Notification.filter(
      { company_id: company.id, user_email: user.email },
      "-created_date",
      50
    );
    setNotifications(list);
    setLoading(false);
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function markRead(id) {
    await base44.entities.Notification.update(id, { is_read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="text-slate-400 py-8 text-center">Loading notifications...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}</p>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
            <CheckCheck className="w-3.5 h-3.5" />Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No notifications yet</p>
          </CardContent>
        </Card>
      )}

      {notifications.map(n => (
        <div
          key={n.id}
          onClick={() => !n.is_read && markRead(n.id)}
          className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${n.is_read ? "bg-white border-slate-100" : "bg-blue-50/60 border-blue-100"}`}
        >
          <div className="flex items-start gap-3">
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
            {n.is_read && <div className="w-2 h-2 mt-1.5 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-semibold ${n.is_read ? "text-slate-700" : "text-slate-900"}`}>{n.title}</p>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {format(new Date(n.created_date), "MMM d, h:mm a")}
                </span>
              </div>
              {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`text-xs ${TYPE_COLORS[n.type] || "bg-slate-100 text-slate-600"}`}>
                  {n.type?.replace(/_/g, " ")}
                </Badge>
                {n.channels_sent?.map(c => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}