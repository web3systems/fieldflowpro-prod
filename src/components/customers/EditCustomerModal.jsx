import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const CUSTOMER_TYPES = [
  { value: "homeowner", label: "Homeowner" },
  { value: "business", label: "Business" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "lead", label: "Lead" },
];

export default function EditCustomerModal({ open, onClose, customer, onSaved }) {
  const [form, setForm] = useState({});
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && customer) {
      setForm({
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        business_name: customer.business_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zip: customer.zip || "",
        notes: customer.notes || "",
        status: customer.status || "active",
        tags: customer.tags || [],
        customer_type: customer.customer_type || "homeowner",
        sms_consent: !!customer.sms_consent,
        marketing_consent: !!customer.marketing_consent,
        notifications_enabled: customer.notifications_enabled !== false,
      });
      setTagInput("");
      setError("");
    }
  }, [open, customer]);

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.tags?.includes(t)) setField("tags", [...(form.tags || []), t]);
    setTagInput("");
  }

  function removeTag(t) {
    setField("tags", (form.tags || []).filter(x => x !== t));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await base44.entities.Customer.update(customer.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        business_name: form.business_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        notes: form.notes,
        status: form.status,
        tags: form.tags,
        customer_type: form.customer_type,
        sms_consent: form.sms_consent,
        marketing_consent: form.marketing_consent,
        notifications_enabled: form.notifications_enabled,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Customer Type</Label>
              <Select value={form.customer_type} onValueChange={v => setField("customer_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setField("status", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={form.first_name} onChange={e => setField("first_name", e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={form.last_name} onChange={e => setField("last_name", e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Business name */}
          <div>
            <Label className="text-xs">Business Name</Label>
            <Input value={form.business_name} onChange={e => setField("business_name", e.target.value)} className="h-9 text-sm" placeholder="Optional" />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input type="tel" value={form.phone} onChange={e => setField("phone", e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="text-xs">Address</Label>
            <Input value={form.address} onChange={e => setField("address", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={e => setField("city", e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={form.state} onChange={e => setField("state", e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Zip</Label>
              <Input value={form.zip} onChange={e => setField("zip", e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs">Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                className="h-9 text-sm"
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" size="sm" variant="outline" onClick={addTag} className="h-9">Add</Button>
            </div>
            {form.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(t => (
                  <Badge key={t} variant="secondary" className="text-xs gap-1 pr-1.5">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={3} className="text-sm" />
          </div>

          {/* Consent toggles */}
          <div className="space-y-2.5 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">SMS Consent</p>
                <p className="text-xs text-slate-500">Customer agreed to receive text messages</p>
              </div>
              <Switch checked={form.sms_consent} onCheckedChange={v => setField("sms_consent", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Marketing Consent</p>
                <p className="text-xs text-slate-500">Customer agreed to marketing emails</p>
              </div>
              <Switch checked={form.marketing_consent} onCheckedChange={v => setField("marketing_consent", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Notifications Enabled</p>
                <p className="text-xs text-slate-500">Send this customer automated notifications</p>
              </div>
              <Switch checked={form.notifications_enabled} onCheckedChange={v => setField("notifications_enabled", v)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}