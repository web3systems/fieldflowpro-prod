import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, BookOpen, ArrowLeftRight, BarChart3, Building2, X } from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, page: "Accounting" },
  { label: "Transactions", icon: ArrowLeftRight, page: "AccountingTransactions" },
  { label: "Chart of Accounts", icon: BookOpen, page: "AccountingAccounts" },
  { label: "Reports", icon: BarChart3, page: "AccountingReports" },
  { label: "Bank Accounts", icon: Building2, page: "AccountingBanks" },
];

export default function AccountingSidebar({ onClose }) {
  const location = useLocation();
  const isActive = (page) => location.pathname.includes(page);

  return (
    <div className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-full">
      <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">FieldFlow</p>
          <p className="text-sm font-bold text-slate-800">Accounting</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ label, icon: Icon, page }) => (
          <Link
            key={page}
            to={createPageUrl(page)}
            onClick={onClose}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive(page)
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}