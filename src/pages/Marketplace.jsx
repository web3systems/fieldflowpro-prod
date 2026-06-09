import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Brain, BarChart3, Megaphone, Calculator, Camera, RefreshCw,
  Globe, Star, CheckCircle2, Loader2, Zap, Package, Boxes
} from "lucide-react";
import { toast } from "sonner";

const ICON_MAP = {
  Brain, BarChart3, Megaphone, Calculator, Camera, RefreshCw, Globe, Star, Boxes, Package
};

const CATEGORY_LABELS = {
  ai: { label: "AI Powered", color: "bg-purple-100 text-purple-700" },
  operations: { label: "Operations", color: "bg-blue-100 text-blue-700" },
  finance: { label: "Finance", color: "bg-green-100 text-green-700" },
  marketing: { label: "Marketing", color: "bg-orange-100 text-orange-700" },
  growth: { label: "Growth", color: "bg-pink-100 text-pink-700" },
};

export default function Marketplace() {
  const { activeCompany, user } = useApp();
  const [modules, setModules] = useState([]);
  const [companyModules, setCompanyModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "manager";

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  async function loadData() {
    if (!activeCompany?.id) return;
    setLoading(true);
    const [mods, compMods] = await Promise.all([
      base44.entities.Module.filter({ is_active: true }, "sort_order"),
      base44.entities.CompanyModule.filter({ company_id: activeCompany.id, status: "active" }),
    ]);
    setModules(mods);
    setCompanyModules(compMods);
    setLoading(false);
  }

  function isActive(module_key) {
    return companyModules.some(cm => cm.module_key === module_key);
  }

  function getCompanyModule(module_key) {
    return companyModules.find(cm => cm.module_key === module_key);
  }

  async function handleSubscribe(mod) {
    if (!isAdmin) {
      toast.error("Only company admins can add modules.");
      return;
    }
    setActionLoading(mod.module_key);
    try {
      // Check if running in iframe
      if (window.self !== window.top) {
        toast.error("Checkout only works from the published app.");
        return;
      }
      const res = await base44.functions.invoke("moduleCheckout", {
        action: "subscribe",
        company_id: activeCompany.id,
        module_key: mod.module_key,
        stripe_price_id: mod.stripe_price_id,
        module_name: mod.name,
        success_url: window.location.href,
        cancel_url: window.location.href,
      });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (e) {
      toast.error("Failed to start checkout: " + e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(mod) {
    if (!isAdmin) {
      toast.error("Only company admins can manage modules.");
      return;
    }
    if (!confirm(`Cancel ${mod.name}? You'll lose access at the end of the billing period.`)) return;
    setActionLoading(mod.module_key);
    try {
      const cm = getCompanyModule(mod.module_key);
      await base44.functions.invoke("moduleCheckout", {
        action: "cancel",
        company_id: activeCompany.id,
        module_key: mod.module_key,
        stripe_subscription_id: cm?.stripe_subscription_id,
      });
      toast.success(`${mod.name} cancelled.`);
      await loadData();
    } catch (e) {
      toast.error("Failed to cancel: " + e.message);
    } finally {
      setActionLoading(null);
    }
  }

  // Handle post-checkout redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successKey = params.get("module_success");
    if (successKey) {
      toast.success("Module activated! Your new features are now available.");
      window.history.replaceState({}, "", window.location.pathname);
      loadData();
    }
  }, []);

  const activeCount = companyModules.length;
  const monthlyTotal = modules
    .filter(m => isActive(m.module_key))
    .reduce((sum, m) => sum + (m.price_monthly || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-20 lg:pb-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Module Marketplace</h1>
            <p className="text-slate-500 text-sm">Expand your platform with powerful add-ons</p>
          </div>
        </div>
        {activeCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-blue-800 font-medium">{activeCount} active module{activeCount !== 1 ? "s" : ""}</span>
            <span className="text-blue-500">·</span>
            <span className="text-blue-700">${monthlyTotal}/mo add-ons</span>
          </div>
        )}
      </div>

      {/* Module Grid */}
      {modules.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No modules available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map(mod => {
            const active = isActive(mod.module_key);
            const IconComp = ICON_MAP[mod.icon] || Package;
            const categoryStyle = CATEGORY_LABELS[mod.category] || CATEGORY_LABELS.operations;
            const isLoading = actionLoading === mod.module_key;

            return (
              <Card
                key={mod.id}
                className={`relative flex flex-col transition-all duration-200 ${
                  active ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-md"
                }`}
              >
                {active && (
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </div>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                      <IconComp className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0 pr-14">
                      <h3 className="font-semibold text-slate-900 text-base">{mod.name}</h3>
                      <Badge className={`mt-1 text-xs ${categoryStyle.color}`} variant="outline">
                        {categoryStyle.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{mod.description}</p>

                  {mod.features?.length > 0 && (
                    <ul className="space-y-1.5">
                      {mod.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-100">
                    <div>
                      <span className="text-xl font-bold text-slate-900">${mod.price_monthly}</span>
                      <span className="text-slate-400 text-sm">/mo</span>
                    </div>
                    {active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancel(mod)}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cancel"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSubscribe(mod)}
                        disabled={isLoading || !isAdmin}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Module"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isAdmin && (
        <p className="text-center text-slate-400 text-sm mt-8">
          Contact your company admin to add or remove modules.
        </p>
      )}
    </div>
  );
}