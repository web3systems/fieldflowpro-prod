import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { JOB_TYPES, DEFAULT_LABOR_RATE, DEFAULT_MATERIAL_MARKUP_PCT } from "@/lib/estimateJobTypes";
import { SlidersHorizontal, Save, RotateCcw, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function EstimatorConfig() {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const recs = await base44.entities.EstimatorConfig.list();
      if (recs[0]) {
        setConfig(recs[0]);
      } else {
        // Seed a default record
        const created = await base44.entities.EstimatorConfig.create({
          name: "default",
          labor_rate: DEFAULT_LABOR_RATE,
          material_markup_pct: DEFAULT_MATERIAL_MARKUP_PCT,
          job_type_costs: {},
        });
        setConfig(created);
      }
    } catch (e) {
      toast({ title: "Error loading config", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function setGlobal(field, value) {
    setConfig(c => ({ ...c, [field]: value === "" ? "" : Number(value) }));
  }

  function setParam(typeId, paramId, value) {
    setConfig(c => {
      const jtc = { ...(c.job_type_costs || {}) };
      const section = { ...(jtc[typeId] || {}) };
      if (value === "" || value === null) {
        delete section[paramId];
      } else {
        section[paramId] = Number(value);
      }
      if (Object.keys(section).length === 0) {
        delete jtc[typeId];
      } else {
        jtc[typeId] = section;
      }
      return { ...c, job_type_costs: jtc };
    });
  }

  function resetParam(typeId, paramId) {
    setParam(typeId, "");
  }

  function resetAll() {
    setConfig(c => ({ ...c, job_type_costs: {} }));
  }

  async function save() {
    setSaving(true);
    try {
      const { id, name, labor_rate, material_markup_pct, job_type_costs } = config;
      await base44.entities.EstimatorConfig.update(id, {
        name,
        labor_rate: Number(labor_rate) || DEFAULT_LABOR_RATE,
        material_markup_pct: Number(material_markup_pct) || DEFAULT_MATERIAL_MARKUP_PCT,
        job_type_costs,
      });
      toast({ title: "Estimator config saved", description: "New estimates will use these settings." });
    } catch (e) {
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Estimator Configuration</h1>
            <p className="text-sm text-gray-400">Adjust the pricing details the estimate wizard uses for each job type.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetAll} className="text-gray-300 border-gray-700 hover:bg-gray-800">
            <RotateCcw className="w-4 h-4" /> Reset overrides
          </Button>
          <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* Global pricing */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-semibold text-orange-400 mb-4">Company-wide Pricing Standard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300 text-xs">Labor bill rate ($/hour)</Label>
            <Input
              type="number"
              value={config.labor_rate}
              onChange={e => setGlobal("labor_rate", e.target.value)}
              className="mt-1.5 bg-gray-950 border-gray-700 text-white"
            />
            <p className="text-[11px] text-gray-500 mt-1">Default ${DEFAULT_LABOR_RATE}/hr</p>
          </div>
          <div>
            <Label className="text-gray-300 text-xs">Material markup (% over cost)</Label>
            <Input
              type="number"
              value={config.material_markup_pct}
              onChange={e => setGlobal("material_markup_pct", e.target.value)}
              className="mt-1.5 bg-gray-950 border-gray-700 text-white"
            />
            <p className="text-[11px] text-gray-500 mt-1">Default {DEFAULT_MATERIAL_MARKUP_PCT}%</p>
          </div>
        </div>
      </div>

      {/* Per job type */}
      <div className="space-y-4">
        {JOB_TYPES.filter(jt => jt.params && jt.params.length > 0).map(jt => {
          const overrides = config.job_type_costs?.[jt.id] || {};
          return (
            <div key={jt.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{jt.label}</h3>
                <span className="text-[11px] text-gray-500">
                  {Object.keys(overrides).length} override{Object.keys(overrides).length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {jt.params.map(p => {
                  const val = overrides[p.id];
                  const isOverride = val !== undefined && val !== null && val !== "";
                  return (
                    <div key={p.id} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-300 text-[11px] leading-tight">{p.label}</Label>
                        {isOverride && (
                          <button
                            type="button"
                            onClick={() => resetParam(jt.id, p.id)}
                            className="text-[10px] text-gray-500 hover:text-orange-400 flex items-center gap-0.5"
                            title="Reset to default"
                          >
                            <RotateCcw className="w-3 h-3" /> reset
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Input
                          type="number"
                          value={isOverride ? val : ""}
                          placeholder={String(p.default)}
                          onChange={e => setParam(jt.id, p.id, e.target.value)}
                          className="bg-gray-900 border-gray-700 text-white text-sm h-8"
                        />
                        <span className="text-[11px] text-gray-500 w-8 text-right">{p.unit}</span>
                      </div>
                      {!isOverride && (
                        <p className="text-[10px] text-gray-600 mt-1">default {p.default}{p.unit === "$" ? "" : p.unit === "hr" ? "h" : ""}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}