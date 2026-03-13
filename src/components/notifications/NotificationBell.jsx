import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function NotificationBell({ user, company }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.email || !company?.id) return;
    loadCount();
    const unsub = base44.entities.Notification.subscribe(event => {
      if (event.type === "create" && event.data?.user_email === user.email) {
        setUnreadCount(c => c + 1);
      }
      if (event.type === "update" && event.data?.is_read) {
        loadCount();
      }
    });
    return unsub;
  }, [user?.email, company?.id]);

  async function loadCount() {
    try {
      const list = await base44.entities.Notification.filter({
        company_id: company.id,
        user_email: user.email,
        is_read: false,
      });
      setUnreadCount(list.length);
    } catch (e) { /* ignore */ }
  }

  return (
    <Link
      to={createPageUrl("Notifications")}
      className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}