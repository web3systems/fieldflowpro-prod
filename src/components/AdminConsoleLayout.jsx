import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ShieldCheck, Building2, UsersRound,
  BarChart3, ClipboardList, LayoutDashboard, Menu, X, LogOut,
  ArrowLeft, ChevronRight, FileText
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const adminNavItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin/saas-admin" },
  { label: "Companies", icon: Building2, path: "/admin/companies" },
  { label: "Users", icon: UsersRound, path: "/admin/users" },
  { label: "Reports", icon: BarChart3, path: "/admin/reports" },
  { label: "Audit Log", icon: ClipboardList, path: "/admin/audit-log" },
  { label: "Article Creator", icon: FileText, path: "/admin/articles" },
];

export default function AdminConsoleLayout({ children }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const currentPath = window.location.pathname;

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        // Gate: only platform admins allowed
        if (u?.role !== "super_admin" && u?.role !== "admin" && u?.role !== "manager") {
          window.location.href = "/Dashboard";
          return;
        }
        setUser(u);
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = (path) => currentPath === path || currentPath.startsWith(path + "/");

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300
        lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-sm tracking-tight">Admin Console</span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5 pl-9">Platform Management</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switch to Company View */}
        <div className="px-4 py-3 border-b border-gray-800">
          <Link
            to="/Dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white text-sm font-medium"
            onClick={() => setSidebarOpen(false)}
          >
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Switch to Company View</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {adminNavItems.map(({ label, icon: Icon, path }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive(path)
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-orange-500 text-white text-xs">
                {user?.full_name?.[0] || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 text-sm font-medium truncate">{user?.full_name || "Admin"}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
            <button onClick={() => base44.auth.logout("/")} className="text-gray-600 hover:text-gray-300">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span className="text-orange-400 font-semibold">Admin Console</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-300">
              {adminNavItems.find(n => isActive(n.path))?.label || ""}
            </span>
          </div>
          <div className="flex-1" />
          <Link
            to="/Dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Company View
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}