import { LogOut, Home, Briefcase, FileText, DollarSign, User, Menu, X, Headphones } from "lucide-react";
import { base44 } from "@/api/base44Client";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "jobs", label: "My Jobs", icon: Briefcase },
  { id: "estimates", label: "Estimates", icon: FileText },
  { id: "invoices", label: "Invoices", icon: DollarSign },
  { id: "account", label: "Account", icon: User },
  { id: "support", label: "Support", icon: Headphones },
];

export default function PortalLayout({ activeTab, setActiveTab, customer, company, children, sidebarOpen, setSidebarOpen }) {
  const accentColor = company?.primary_color || "#2563eb";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-500 p-1" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2.5">
              {company?.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="h-8 w-auto object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: accentColor }}>
                  {company?.name?.[0] || "C"}
                </div>
              )}
              <span className="font-bold text-slate-800 text-sm hidden sm:block">{company?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: accentColor }}>
                {customer?.first_name?.[0] || "C"}
              </div>
              <span className="text-xs font-medium text-slate-700">{customer?.first_name} {customer?.last_name}</span>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-100 flex flex-col pt-16 pb-4 transition-transform duration-200
          lg:relative lg:translate-x-0 lg:pt-0
          ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}
        `}>
          <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === id
                    ? "text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                style={activeTab === id ? { backgroundColor: accentColor } : {}}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* Company contact */}
          {(company?.phone || company?.email) && (
            <div className="px-3 pt-3 border-t border-slate-100 mx-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Contact Us</p>
              {company.phone && <p className="text-xs text-slate-600 mb-1">📞 {company.phone}</p>}
              {company.email && <p className="text-xs text-slate-600 break-all">✉️ {company.email}</p>}
            </div>
          )}
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 lg:hidden">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 flex-1 transition-colors ${
                activeTab === id ? "text-blue-600" : "text-slate-400"
              }`}
              style={activeTab === id ? { color: accentColor } : {}}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}