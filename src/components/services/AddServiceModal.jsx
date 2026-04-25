import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const defaultForm = {
  name: "", description: "", item_type: "service", category: "Labor",
  unit_price: 0, unit: "flat", taxable: true, is_active: true,
};

export default function AddServiceModal({ companyId, onCreated, onClose }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const created = await base44.entities.Service.create({ ...form, company_id: companyId });
    setSaving(false);
    onCreated(created);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">Add to Price Book</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, item_type: "service", unit: "flat", category: "Labor" }))}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.item_type === "service" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
            >
              🔧 Service / Labor
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, item_type: "material", unit: "each", category: "Other" }))}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.item_type === "material" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
            >
              📦 Material
            </button>
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={form.item_type === "service" ? "e.g. Window Cleaning" : "e.g. 2x4x8 Stud"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Labor, Lumber..." />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Rate</SelectItem>
                  <SelectItem value="hourly">Per Hour</SelectItem>
                  <SelectItem value="per_sqft">Per Sq Ft</SelectItem>
                  <SelectItem value="per_unit">Per Unit</SelectItem>
                  <SelectItem value="each">Each</SelectItem>
                  <SelectItem value="per_lb">Per Lb</SelectItem>
                  <SelectItem value="per_ft">Per Ft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Unit Price ($)</Label>
            <Input type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional notes..." />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700">
            {saving ? "Saving..." : "Add to Price Book"}
          </Button>
        </div>
      </div>
    </div>
  );
}