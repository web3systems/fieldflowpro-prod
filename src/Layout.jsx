import { useState, useEffect, createContext, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Users, Briefcase, FileText, DollarSign,
  UserPlus, Settings, Building2, Menu, X, ChevronDown,
  Bell, LogOut, Wrench, BarChart3, Globe, Home, UsersRound, CalendarDays, ShieldCheck, CreditCard, Megaphone, Calculator, MessageCircle
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import GlobalChatPanel from "@/components/chat/GlobalChatPanel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export const AppContext = createContext({});
export const useApp = () => useContext(AppContext);

function useAccessRequestCount(isSuperAdmin) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isSuperAdmin) return;
    base44.entities.AccessRequest.filter({ status: "pending" })
      .then(reqs => setCount(reqs.length))
      .catch(() => {});
  }, [isSuperAdmin]);
  return count;
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { label: "Leads", icon: UserPlus, page: "Leads" },
  { label: "Customers", icon: Users, page: "Customers" },
  { label: "Estimates", icon: FileText, page: "Estimates" },
  { label: "Jobs", icon: Briefcase, page: "Jobs" },
  { label: "Schedule", icon: CalendarDays, page: "Schedule" },
  { label: "Invoices", icon: DollarSign, page: "Invoices" },
  { label: "Payments", icon: CreditCard, page: "Payments" },
  { label: "Notifications", icon: Bell, page: "Notifications" },
  { label: "Messages", icon: MessageCircle, page: "Messages" },
  { label: "Accounting", icon: Calculator, page: "Accounting" },
  { label: "Team", icon: Wrench, page: "Team" },
  { label: "Services", icon: Wrench, page: "Services" },
  { label: "Settings", icon: Settings, page: "CompanySettings" },
];

const adminItems = [
  { label: "SaaS Admin", icon: ShieldCheck, page: "SaaSAdminDashboard" },
  { label: "Admin Dashboard", icon: ShieldCheck, page: "SuperAdminDashboard" },
  { label: "Marketing", icon: Megaphone, page: "Marketing" },
  { label: "Accounting", icon: Calculator, page: "AccountingAdmin" },
  { label: "Companies", icon: Building2, page: "Companies" },
  { label: "Employees", icon: UsersRound, page: "Users" },
  { label: "Reports", icon: BarChart3, page: "Reports" },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isCustomerPortal = currentPageName === "CustomerPortal";
  const isSuperAdminUser = user?.role === "super_admin" || user?.role === "admin";
  const pendingRequestCount = useAccessRequestCount(isSuperAdminUser);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && !isCustomerPortal) loadCompanies();
  }, [user]);

  async function loadUser() {
    try {
      const u = await base44.auth.me();
      setUser(u);
    } catch (e) {
      // not logged in
    }
  }

  async function loadCompanies() {
    try {
      const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "manager";
      const allCompanies = await base44.entities.Company.list();
      let list = allCompanies;
      if (!isAdmin && user?.email) {
        const access = await base44.entities.UserCompanyAccess.filter({ user_email: user.email });
        const allowedIds = access.map(a => a.company_id);
        list = allCompanies.filter(c => allowedIds.includes(c.id));
      }
      setCompanies(list);
      // Super admins don't require a default company to be set
      if (isAdmin && list.length === 0) return;
      const saved = localStorage.getItem("activeCompanyId");
      const found = list.find(c => c.id === saved) || list[0];
      setActiveCompany(found || null);
    } catch (e) {}
  }

  function switchCompany(company) {
    setActiveCompany(company);
    localStorage.setItem("activeCompanyId", company.id);
    setSidebarOpen(false);
  }

  if (isCustomerPortal) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "manager";
  const isActive = (page) => currentPageName === page;

  return (
    <AppContext.Provider value={{ user, activeCompany, companies, switchCompany, refreshCompanies: loadCompanies }}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-300
          lg:relative lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          {/* Logo */}
          <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700/50">
            <div className="flex items-center">
              <img src="https://media.base44.com/images/public/69b20e4261ce8a3e5bf093b0/408bce6f6_LGipynfh-removebg-preview.png" alt="FieldFlow Pro" style={{height: '7rem'}} className="w-auto brightness-0 invert" />
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Company Switcher */}
          {companies.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-700/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: activeCompany?.primary_color || "#3b82f6" }}
                    >
                      {activeCompany?.name?.[0] || "?"}
                    </div>
                    <span className="text-slate-200 text-sm font-medium truncate flex-1 text-left">
                      {activeCompany?.name || "Select Company"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 ml-4">
                  {companies.map(c => (
                    <DropdownMenuItem key={c.id} onClick={() => switchCompany(c)} className="gap-2">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: c.primary_color || "#3b82f6" }}
                      >
                        {c.name[0]}
                      </div>
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
            {navItems.map(({ label, icon: Icon, page }) => (
              <Link
                key={page}
                to={createPageUrl(page)}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive(page)
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}

            {isSuperAdmin && (
              <>
                <div className="pt-4 pb-1 px-3">
                  <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Admin</p>
                </div>
                {adminItems.map(({ label, icon: Icon, page }) => (
                  <Link
                    key={page}
                    to={createPageUrl(page)}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isActive(page)
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* User */}
          <div className="px-3 py-4 border-t border-slate-700/50">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {user?.full_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm font-medium truncate">{user?.full_name || "User"}</p>
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
              <button onClick={() => base44.auth.logout()} className="text-slate-500 hover:text-slate-300">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {isSuperAdminUser && pendingRequestCount > 0 && (
                <Link
                  to={createPageUrl("SuperAdminDashboard")}
                  className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  <span className="w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                    {pendingRequestCount}
                  </span>
                </Link>
              )}
              <NotificationBell user={user} company={activeCompany} />
              <Link
                to={createPageUrl("Settings")}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto relative">
            {children}
          </main>
        </div>

        {/* Global Chat Panel */}
        <GlobalChatPanel user={user} company={activeCompany} />

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 lg:hidden">
          <div className="flex items-center justify-around py-2">
            {[
              { label: "Home", icon: Home, page: "Dashboard" },
              { label: "Jobs", icon: Briefcase, page: "Jobs" },
              { label: "Customers", icon: Users, page: "Customers" },
              { label: "Leads", icon: UserPlus, page: "Leads" },
              { label: "More", icon: Menu, page: null },
            ].map(({ label, icon: Icon, page }) => (
              page ? (
                <Link
                  key={label}
                  to={createPageUrl(page)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${
                    isActive(page) ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{label}</span>
                </Link>
              ) : (
                <button
                  key={label}
                  onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-slate-400"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{label}</span>
                </button>
              )
            ))}
          </div>
        </div>
      </div>
    </AppContext.Provider>
  );
}