import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Cache per company to avoid re-fetching on every render
const cache = {};

export function useModules(companyId) {
  const [activeModules, setActiveModules] = useState(cache[companyId] || []);
  const [loading, setLoading] = useState(!cache[companyId]);

  useEffect(() => {
    if (!companyId) return;
    if (cache[companyId]) {
      setActiveModules(cache[companyId]);
      setLoading(false);
      return;
    }
    base44.entities.CompanyModule.filter({ company_id: companyId, status: "active" })
      .then(mods => {
        const keys = mods.map(m => m.module_key);
        cache[companyId] = keys;
        setActiveModules(keys);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  function hasModule(key) {
    return activeModules.includes(key);
  }

  function invalidateCache() {
    delete cache[companyId];
  }

  return { activeModules, loading, hasModule, invalidateCache };
}