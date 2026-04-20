import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Save, Info } from "lucide-react";

export default function MarginRulesTab({ company }) {
  const [rule, setRule] = useState(null);
  const [form, setForm] = useState({
    min_markup_pct: 30,
    labor_markup_pct: "",
    materials_markup_pct: "",
    min_total_amount: 0,
    auto_approve: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!company?.id) return;
    base44.entities.MarginRule.filter({ company_id: company.id })
      .then(rules => {
        if (rules[0]) {
          setRule(rules[0]);
          setForm({
            min_markup_pct: rules[0].min_markup_pct ?? 30,
            labor_markup_pct: rules[0].labor_markup_pct ?? "",
            materials_markup_pct: rules[0].materials_markup_pct ?? "",
            min_total_amount: rules[0].min_total_amount ?? 0,
            auto_approve: rules[0].auto_approve ?? false,
            notes: rules[0].notes ?? "",
          });
        }
      })
      .catch(() => {});
  }, [company?.id]);

  async function handleSave() {
    setSaving(true);
    const data = {
      company_id: company.id,
      min_markup_pct: parseFloat(form.min_markup_pct) || 0,
      labor_markup_pct: form.labor_markup_pct !== "" ? parseFloat(form.labor_markup_pct) : null,
      materials_markup_pct: form.materials_markup_pct !== "" ? parseFloat(form.materials_markup_pct) : null,
      min_total_amount: parseFloat(form.min_total_amount) || 0,
      auto_approve: form.auto_approve,
      notes: form.notes,
    };
    if (rule?.id) {
      await base44.entities.MarginRule.update(rule.id, data);
    } else {
      const created = await base44.entities.MarginRule.create(data);
      setRule(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-500" />
            Margin Rules
          </CardTitle>
          <p className="text-sm text-slate-500">
            Configure minimum markup thresholds. The AI margin review agent checks every estimate against these rules before it can be sent to customers.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Default markup */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Default Min Markup Over Cost (%)</Label>
              <p className="text-xs text-slate-400 mb-1">Applied to all items unless overridden below</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={500}
                  value={form.min_markup_pct}
                  onChange={e => setForm(f => ({ ...f, min_markup_pct: e.target.value }))}
                  className="w-28"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
            <div>
              <Label className="text-sm">Minimum Total Estimate Amount</Label>
              <p className="text-xs text-slate-400 mb-1">Estimates below this amount will be flagged</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">$</span>
                <Input
                  type="number"
                  min={0}
                  value={form.min_total_amount}
                  onChange={e => setForm(f => ({ ...f, min_total_amount: e.target.value }))}
                  className="w-28"
                />
              </div>
            </div>
          </div>

          {/* Category overrides */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-3">Category Overrides (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Labor Min Markup (%)</Label>
                <p className="text-xs text-slate-400 mb-1">Leave blank to use default</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={500}
                    value={form.labor_markup_pct}
                    onChange={e => setForm(f => ({ ...f, labor_markup_pct: e.target.value }))}
                    placeholder="e.g. 50"
                    className="w-28"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>
              <div>
                <Label className="text-sm">Materials Min Markup (%)</Label>
                <p className="text-xs text-slate-400 mb-1">Leave blank to use default</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={500}
                    value={form.materials_markup_pct}
                    onChange={e => setForm(f => ({ ...f, materials_markup_pct: e.target.value }))}
                    placeholder="e.g. 25"
                    className="w-28"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-approve toggle */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Auto-Approve Passing Estimates</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  When ON, estimates that pass the margin review are automatically approved for sending — no manual review needed. 
                  Enable this once you have high confidence in your pricing process.
                </p>
              </div>
              <Switch
                checked={form.auto_approve}
                onCheckedChange={v => setForm(f => ({ ...f, auto_approve: v }))}
              />
            </div>
            {form.auto_approve && (
              <div className="mt-2 flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg text-xs text-blue-700">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Auto-approve is ON. Estimates passing the margin check will show an immediate "Approve for Sending" button without needing manual review.
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="border-t border-slate-100 pt-4">
            <Label className="text-sm">Internal Notes</Label>
            <p className="text-xs text-slate-400 mb-1">Context about these rules (shown to the AI reviewer)</p>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Our labor rate is $45/hr. Materials are typically sourced at 60% of retail price..."
              rows={3}
              className="text-sm"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : saved ? "Saved!" : "Save Rules"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}