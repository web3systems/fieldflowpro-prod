import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Bell, Slack, Phone, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CHANNELS = [
  { key: "in_app", label: "In-App", icon: Bell, description: "Bell icon in your dashboard" },
  { key: "email", label: "Email", icon: Mail, description: "Delivered to your email address" },
  { key: "sms", label: "SMS", icon: Phone, description: "Text message to your phone" },
  { key: "slack", label: "Slack", icon: Slack, description: "Slack workspace notification" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, description: "WhatsApp message" },
];

const EVENTS = [
  { key: "new_job_assigned", label: "Job Assigned to Me", category: "Jobs" },
  { key: "job_status_change", label: "Job Status Changed", category: "Jobs" },
  { key: "job_reminder", label: "Upcoming Job Reminder", category: "Jobs" },
  { key: "new_booking", label: "New Booking Request", category: "Bookings" },
  { key: "new_lead", label: "New Lead Captured", category: "Leads" },
  { key: "new_customer", label: "New Customer Added", category: "Customers" },
  { key: "invoice_paid", label: "Invoice Paid", category: "Finance" },
  { key: "invoice_overdue", label: "Invoice Overdue", category: "Finance" },
  { key: "payment_received", label: "Payment Received", category: "Finance" },
  { key: "estimate_approved", label: "Estimate Approved", category: "Finance" },
];

const DEFAULT_SETTINGS = {
  is_enabled: true,
  channels: { email: true, sms: false, in_app: true, slack: false, whatsapp: false },
  events: {
    new_job_assigned: true, job_status_change: true, job_reminder: true,
    new_booking: true, new_lead: true, new_customer: false,
    invoice_paid: true, invoice_overdue: true, payment_received: true, estimate_approved: true,
  }
};

export default function NotificationSettings({ user, company }) {
  const [settings, setSettings] = useState(null);
  const [settingId, setSettingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.email || !company?.id) return;
    loadSettings();
  }, [user?.email, company?.id]);

  async function loadSettings() {
    const list = await base44.entities.NotificationSetting.filter({
      user_email: user.email,
      company_id: company.id
    });
    if (list.length > 0) {
      setSettingId(list[0].id);
      setSettings({ ...DEFAULT_SETTINGS, ...list[0], channels: { ...DEFAULT_SETTINGS.channels, ...list[0].channels }, events: { ...DEFAULT_SETTINGS.events, ...list[0].events } });
    } else {
      setSettings({ ...DEFAULT_SETTINGS });
    }
  }

  async function save() {
    setSaving(true);
    const data = { ...settings, user_email: user.email, user_name: user.full_name, company_id: company.id };
    if (settingId) {
      await base44.entities.NotificationSetting.update(settingId, data);
    } else {
      const created = await base44.entities.NotificationSetting.create(data);
      setSettingId(created.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function setChannel(key, val) {
    setSettings(s => ({ ...s, channels: { ...s.channels, [key]: val } }));
  }

  function setEvent(key, val) {
    setSettings(s => ({ ...s, events: { ...s.events, [key]: val } }));
  }

  if (!settings) return <div className="text-slate-400 py-8 text-center">Loading preferences...</div>;

  const categories = [...new Set(EVENTS.map(e => e.category))];

  return (
    <div className="space-y-4">
      {/* Master Toggle */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">All Notifications</p>
            <p className="text-sm text-slate-500">Globally enable or disable all notifications</p>
          </div>
          <Switch checked={settings.is_enabled} onCheckedChange={v => setSettings(s => ({ ...s, is_enabled: v }))} />
        </CardContent>
      </Card>

      {settings.is_enabled && (
        <>
          {/* Channels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Delivery Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CHANNELS.map(({ key, label, icon: Icon, description }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400">{description}</p>
                    </div>
                  </div>
                  <Switch checked={!!settings.channels[key]} onCheckedChange={v => setChannel(key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Event Types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notification Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {categories.map(cat => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{cat}</p>
                  <div className="space-y-2">
                    {EVENTS.filter(e => e.category === cat).map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <Label className="text-sm text-slate-700 font-normal cursor-pointer">{label}</Label>
                        <Switch checked={!!settings.events[key]} onCheckedChange={v => setEvent(key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Button onClick={save} disabled={saving} className="w-full gap-2">
        {saved ? <><CheckCircle className="w-4 h-4" />Saved!</> : saving ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
}