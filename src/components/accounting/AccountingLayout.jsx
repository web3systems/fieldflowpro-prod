import { useState } from "react";
import { Menu } from "lucide-react";
import AccountingSidebar from "./AccountingSidebar";
import AccountingGate from "./AccountingGate";

export default function AccountingLayout({ companyId, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AccountingGate companyId={companyId}>
      <div className="flex h-full min-h-screen bg-slate-50">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <AccountingSidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
              <AccountingSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-900">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-slate-800 text-sm">Accounting</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </AccountingGate>
  );
}