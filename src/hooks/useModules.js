import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Cache per company to avoid re-fetching on every render
const cache = {};

export function useModules(companyId) {
  const [activeModules, setActiveModules] = useState(cache[companyId] || []);
  const [loading, setLoading] = useState(!cache[companyId]);

  useEffect(() => {
    if (!companyId) return;
    // Always re-fetch (don't use stale cache) — just use cache as initial value
    setLoading(true);
    base44.entities.CompanyModule.filter({ company_id: companyId, status: "active" })
      .then(mods => {
        const keys = mods.map(m => m.module_key);
        setActiveModules(keys);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  function hasModule(key) {
    return activeModules.includes(key);
  }

  function invalidateCache() {
    // no-op kept for API compatibility
  }

  return { activeModules, loading, hasModule, invalidateCache };
}