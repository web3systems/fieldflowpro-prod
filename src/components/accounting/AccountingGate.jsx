import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Lock } from "lucide-react";

export default function AccountingGate({ companyId, children }) {
  const [isActive, setIsActive] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    base44.entities.AccountingModule.filter({ company_id: companyId })
      .then(results => {
        const mod = results[0];
        setIsActive(mod?.is_active === true);
      })
      .catch(() => setIsActive(false));
  }, [companyId]);

  if (isActive === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <Lock className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Accounting Module Not Activated</h2>
          <p className="text-slate-500 mt-1 text-sm">This feature is not enabled for your company. Contact your administrator to activate it.</p>
        </div>
      </div>
    );
  }

  return children;
}