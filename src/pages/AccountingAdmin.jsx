import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calculator, Building2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AccountingAdmin() {
  const { user } = useApp();
  const [companies, setCompanies] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const { toast } = useToast();

  const isSuperAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isSuperAdmin) loadData();
  }, [isSuperAdmin]);

  async function loadData() {
    setLoading(true);
    const [cos, mods] = await Promise.all([
      base44.entities.Company.list(),
      base44.entities.AccountingModule.list(),
    ]);
    setCompanies(cos);
    setModules(mods);
    setLoading(false);
  }

  function getModule(companyId) {
    return modules.find(m => m.company_id === companyId);
  }

  async function toggleModule(company) {
    setToggling(company.id);
    const existing = getModule(company.id);
    if (existing) {
      await base44.entities.AccountingModule.update(existing.id, {
        is_active: !existing.is_active,
        activated_by: user?.email,
        activated_at: new Date().toISOString(),
      });
    } else {
      await base44.entities.AccountingModule.create({
        company_id: company.id,
        is_active: true,
        activated_by: user?.email,
        activated_at: new Date().toISOString(),
      });
    }
    await loadData();
    setToggling(null);
    toast({ title: "Module updated successfully" });
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center text-slate-500">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p>Super Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounting Module Management</h1>
          <p className="text-slate-500 text-sm">Activate or deactivate the accounting module per company</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Companies ({companies.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {companies.map(company => {
                const mod = getModule(company.id);
                const isActive = mod?.is_active === true;
                return (
                  <div key={company.id} className="flex items-center gap-4 px-4 py-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: company.primary_color || "#6366f1" }}
                    >
                      {company.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{company.name}</p>
                      {mod?.activated_by && (
                        <p className="text-xs text-slate-400">
                          {isActive ? "Activated" : "Deactivated"} by {mod.activated_by}
                        </p>
                      )}
                    </div>
                    <Badge className={isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                      checked={isActive}
                      disabled={toggling === company.id}
                      onCheckedChange={() => toggleModule(company)}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}