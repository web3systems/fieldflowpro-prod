import { useState, useEffect, createContext, useContext, Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Users, Briefcase, FileText, DollarSign,
  UserPlus, Settings, Building2, Menu, X, ChevronDown, Inbox,
  Bell, LogOut, Wrench, BarChart3, Globe, Home, UsersRound, CalendarDays, ShieldCheck, CreditCard, Megaphone, Calculator, MessageCircle, Mail, BookOpen, CheckSquare, Package, Boxes, Camera, Mic, ExternalLink, Zap, ClipboardList, Newspaper
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import SeoHead from "@/components/seo/SeoHead";
import GlobalChatPanel from "@/components/chat/GlobalChatPanel";
import SubscriptionGate from "@/components/subscription/SubscriptionGate";
import PastDueBanner from "@/components/subscription/PastDueBanner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export const AppContext = createContext({});
export const useApp = () => useContext(AppContext);

const FINANCIAL_PAGES = ['Invoices', 'InvoiceDetail', 'Payments', 'Accounting', 'AccountingAdmin', 'AccountingAccounts', 'AccountingBanks', 'AccountingTransactions', 'AccountingReports', 'AccountingAudit', 'Expenses', 'ProfitMargin', 'ReceiptScanner', 'EmailTemplateEditor', 'Marketplace'];

function isRoleFinancialBlocked(role) {
  return role === 'field_service_manager';
}

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

const navGroups = [
  // Overview
  { items: [
    { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
    { label: "Henry (AI)", icon: Mic, page: "Henry" },
  ] },
  { divider: true },
  // CRM / Sales
  { items: [
    { label: "Leads", icon: UserPlus, page: "Leads" },
    { label: "Customers", icon: Users, page: "Customers" },
  ] },
  { divider: true },
  // Workflow
  { items: [
    { label: "Estimates", icon: FileText, page: "Estimates" },
    { label: "Jobs", icon: Briefcase, page: "Jobs" },
    { label: "Schedule", icon: CalendarDays, page: "Schedule" },
    { label: "Dispatch", icon: Zap, page: "Dispatch" },
    { label: "Work Logs", icon: ClipboardList, page: "WorkLogs" },
  ] },
  { divider: true },
  // Finance
  { items: [
    { label: "Invoices", icon: DollarSign, page: "Invoices" },
    { label: "Payments", icon: CreditCard, page: "Payments" },
    { label: "Accounting", icon: Calculator, page: "Accounting" },
  ] },
  { divider: true },
  // Tools
  { items: [
    { label: "Tasks", icon: CheckSquare, page: "Tasks" },
    { label: "Inventory", icon: Boxes, page: "Inventory" },
    { label: "Price Book", icon: BookOpen, page: "PriceBook" },
    { label: "Receipt Scanner", icon: Camera, page: "ReceiptScanner" },
  ] },
  { divider: true },
  // Communication
  { items: [
    { label: "Notifications", icon: Bell, page: "Notifications" },
    { label: "Messages", icon: MessageCircle, page: "Messages" },
  ] },
  { divider: true },
  // Admin / Config
  { items: [
    { label: "Team", icon: Wrench, page: "CompanySettings" },
    { label: "Email Templates", icon: Mail, page: "EmailTemplateEditor" },
    { label: "Marketplace", icon: Package, page: "Marketplace" },
    { label: "Settings", icon: Settings, page: "CompanySettings" },
  ] },
  { divider: true },
  // Help
  { items: [
    { label: "Support", icon: MessageCircle, page: "Support" },
    { label: "Articles", icon: Newspaper, page: "Articles" },
    { label: "Documentation", icon: BookOpen, page: "Documentation" },
  ] },
  { divider: true },
  // Super Admin only
  { items: [
    { label: "Review Queue", icon: Inbox, page: "MessageQueue" },
  ], superAdminOnly: true },
];



export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [companyRole, setCompanyRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const location = useLocation();

  const isCustomerPortalCheck = currentPageName === "CustomerPortal";
  const isCustomerPortal = isCustomerPortalCheck;
  const isSuperAdminUser = user?.role === "super_admin" || user?.role === "admin";
  const pendingRequestCount = useAccessRequestCount(isSuperAdminUser);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) loadCompanies();
  }, [user]);

  useEffect(() => {
    if (activeCompany?.id) {
      base44.entities.Subscription.filter({ company_id: activeCompany.id })
        .then(subs => setSubscription(subs[0] || null))
        .catch(() => {});
    }
  }, [activeCompany?.id]);

  async function loadUser() {
    try {
      const u = await base44.auth.me();
      setUser(u);
      // Apply any pending password from registration
      base44.functions.invoke('applyPendingPassword', {}).catch(() => {});
    } catch (e) {
      // not logged in
    }
  }

  async function loadCompanies() {
    // Safety timeout: never leave the spinner running forever
    const timeout = setTimeout(() => setCompaniesLoading(false), 8000);
    try {
      if (!user?.email) { clearTimeout(timeout); setCompaniesLoading(false); return; }
      setCompaniesLoading(true);

      // Run company access check and customer portal check in parallel
      const [companyRes, portalRes] = await Promise.all([
        base44.functions.invoke('getUserCompanies', {}).catch(() => ({ data: { companies: [] } })),
        window.location.pathname !== '/CustomerPortal'
          ? base44.functions.invoke('getCustomerPortalData', { action: 'init' }).catch(() => null)
          : Promise.resolve(null),
      ]);

      const list = companyRes.data?.companies || [];
      const portalData = portalRes?.data;

      // If user has customer records but NO staff company access → send to portal
      if (list.length === 0 && portalData?.customers?.length > 0) {
        window.location.href = '/CustomerPortal';
        return;
      }

      setCompanies(list);
      const saved = localStorage.getItem("activeCompanyId");
      const found = list.find(c => c.id === saved) || list[0];
      setActiveCompany(found || null);
      setCompanyRole(found?.user_role || null);
    } catch (e) {
      console.error('loadCompanies error:', e);
    } finally {
      clearTimeout(timeout);
      setCompaniesLoading(false);
    }
  }

  function switchCompany(company) {
    setActiveCompany(company);
    setCompanyRole(company?.user_role || null);
    localStorage.setItem("activeCompanyId", company.id);
  }

  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "manager";
  const isActive = (page) => currentPageName === page;
  const blockFinancials = isRoleFinancialBlocked(companyRole);

  const isPlatformSuperAdmin = user?.role === "super_admin";

  // Filter nav groups based on role (remove blocked items, drop empty groups, collapse stray dividers)
  let visibleNavGroups = blockFinancials
    ? navGroups
        .map(g => g.divider ? g : { items: g.items.filter(i => !FINANCIAL_PAGES.includes(i.page)) })
        .filter(g => g.divider || g.items.length > 0)
    : navGroups;
  // Hide super-admin-only groups from non-super-admins
  visibleNavGroups = visibleNavGroups.filter(g => g.divider || !g.superAdminOnly || isPlatformSuperAdmin);
  // Collapse consecutive dividers and trim leading/trailing ones
  visibleNavGroups = visibleNavGroups.filter((g, i) => {
    if (!g.divider) return true;
    const prev = visibleNavGroups[i - 1];
    const next = visibleNavGroups[i + 1];
    return prev && next && !prev.divider && !next.divider;
  });

  // Redirect field service managers away from financial pages
  useEffect(() => {
    if (blockFinancials && FINANCIAL_PAGES.includes(currentPageName)) {
      window.location.href = createPageUrl('Dashboard');
    }
  }, [blockFinancials, currentPageName]);

  if (isCustomerPortal) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <AppContext.Provider value={{ user, activeCompany, companyRole, companies, companiesLoading, switchCompany, refreshCompanies: loadCompanies }}>
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

          {/* Admin Console switch — platform admins only */}
          {isSuperAdmin && (
            <div className="px-4 py-2 border-b border-slate-700/50">
              <Link
                to="/admin/saas-admin"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 text-xs font-semibold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                Switch to Admin Console
                <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
              </Link>
            </div>
          )}

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
                        className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: c.primary_color || '#3b82f6' }}
                      >
                        {c.name[0]}
                      </div>
                      <span className={c.parent_company_id ? 'pl-2 text-slate-600' : ''}>
                        {c.parent_company_id ? '↳ ' : ''}{c.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
            {visibleNavGroups.map((group, gIdx) => group.divider ? (
              <div key={`div-${gIdx}`} className="my-2 mx-3 border-t border-slate-700/40" />
            ) : (
              <Fragment key={`grp-${gIdx}`}>
                {group.items.map(({ label, icon: Icon, page }) => (
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
              </Fragment>
            )
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
              <Link to={user?.id ? `/UserProfile/${user.id}` : "#"} className="flex-1 min-w-0 hover:opacity-80 transition-opacity" onClick={() => setSidebarOpen(false)}>
                <p className="text-slate-200 text-sm font-medium truncate">{user?.full_name || "User"}</p>
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </Link>
              <button onClick={() => base44.auth.logout('/')} className="text-slate-500 hover:text-slate-300">
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
            <PastDueBanner subscription={subscription} company={activeCompany} />
            <SubscriptionGate company={activeCompany} user={user}>
              {children}
            </SubscriptionGate>
          </main>
        </div>

        {/* Global Chat Panel */}
        <GlobalChatPanel user={user} company={activeCompany} />

        {/* SEO & Analytics injection */}
        <SeoHead company={activeCompany} />

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 lg:hidden safe-area-inset-bottom">
          <div className="flex items-center justify-around py-1 pb-2">
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
                  className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg min-w-[60px] ${
                    isActive(page) ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs">{label}</span>
                </Link>
              ) : (
                <button
                  key={label}
                  onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg text-slate-400 min-w-[60px]"
                >
                  <Icon className="w-6 h-6" />
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