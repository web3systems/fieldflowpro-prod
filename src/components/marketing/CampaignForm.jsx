import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";

export default function CampaignForm({ campaign, onSave, onCancel, saving }) {
  const [form, setForm] = useState(campaign || {
    name: "", type: "email", subject: "", message: "",
    audience: "all_customers", notes: ""
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <Label>Campaign Name *</Label>
        <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Spring Promo 2026" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <Select value={form.type} onValueChange={v => set("type", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email"><span className="flex items-center gap-2"><Mail className="w-3 h-3" />Email</span></SelectItem>
              <SelectItem value="sms"><span className="flex items-center gap-2"><Phone className="w-3 h-3" />SMS</span></SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Audience</Label>
          <Select value={form.audience} onValueChange={v => set("audience", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_customers">All Customers</SelectItem>
              <SelectItem value="active_customers">Active Customers</SelectItem>
              <SelectItem value="inactive_customers">Inactive Customers</SelectItem>
              <SelectItem value="leads">Leads</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.type === "email" && (
        <div>
          <Label>Subject Line *</Label>
          <Input value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="Your email subject..." />
        </div>
      )}

      <div>
        <Label>Message *</Label>
        <p className="text-xs text-slate-400 mb-1">Use <Badge variant="outline" className="text-xs px-1 py-0">{"{name}"}</Badge> to personalize with recipient's name</p>
        <Textarea
          value={form.message}
          onChange={e => set("message", e.target.value)}
          placeholder={form.type === "email" ? "Write your email body here..." : "Write your SMS message (keep under 160 chars)..."}
          rows={form.type === "email" ? 8 : 4}
          className="resize-none"
        />
        {form.type === "sms" && (
          <p className={`text-xs mt-1 ${form.message.length > 160 ? "text-red-500" : "text-slate-400"}`}>
            {form.message.length}/160 characters
          </p>
        )}
      </div>

      <div>
        <Label>Internal Notes</Label>
        <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes for your team..." />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button
          onClick={() => onSave(form)}
          disabled={saving || !form.name || !form.message || (form.type === "email" && !form.subject)}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {saving ? "Saving..." : campaign?.id ? "Save Changes" : "Create Campaign"}
        </Button>
      </div>
    </div>
  );
}