import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CHANNELS = [
  { key: "email", label: "Email", icon: Mail, description: "Send emails to customers" },
  { key: "sms", label: "SMS", icon: Phone, description: "Send text messages to customers" },
];

const EVENTS = [
  { key: "booking_confirmed", label: "Booking Confirmed", category: "Bookings", description: "When a booking request is confirmed" },
  { key: "booking_reminder", label: "Booking Reminder", category: "Bookings", description: "Reminder before a scheduled booking" },
  { key: "job_scheduled", label: "Job Scheduled", category: "Jobs", description: "When a job is scheduled for the customer", hasMessage: true },
  { key: "job_on_the_way", label: "Technician On The Way", category: "Jobs", description: "When a technician is en route" },
  { key: "job_completed", label: "Job Completed", category: "Jobs", description: "When a job is marked as completed", hasMessage: true },
  { key: "estimate_sent", label: "Estimate Sent", category: "Finance", description: "When an estimate is sent to the customer" },
  { key: "invoice_sent", label: "Invoice Sent", category: "Finance", description: "When an invoice is sent to the customer", hasMessage: true },
  { key: "invoice_reminder", label: "Invoice Payment Reminder", category: "Finance", description: "Reminder for unpaid invoices" },
  { key: "payment_receipt", label: "Payment Receipt", category: "Finance", description: "Confirmation after payment is received" },
  { key: "review_request", label: "Review Request", category: "Follow-up", description: "Ask customer for a review after job completion" },
];

const DEFAULT_SETTINGS = {
  is_enabled: true,
  channels: { email: true, sms: false },
  events: {
    booking_confirmed: true, booking_reminder: true,
    job_scheduled: true, job_on_the_way: false, job_completed: true,
    estimate_sent: true, invoice_sent: true, invoice_reminder: true,
    payment_receipt: true, review_request: false,
  },
  custom_messages: {}
};

export default function CustomerNotificationSettings({ company }) {
  const [settings, setSettings] = useState(null);
  const [settingId, setSettingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!company?.id) return;
    loadSettings();
  }, [company?.id]);

  async function loadSettings() {
    const list = await base44.entities.CustomerNotificationSetting.filter({ company_id: company.id });
    if (list.length > 0) {
      setSettingId(list[0].id);
      const saved = list[0];
      setSettings({
        ...DEFAULT_SETTINGS,
        ...saved,
        is_enabled: saved.is_enabled !== undefined && saved.is_enabled !== null ? saved.is_enabled : DEFAULT_SETTINGS.is_enabled,
        channels: { ...DEFAULT_SETTINGS.channels, ...saved.channels },
        events: { ...DEFAULT_SETTINGS.events, ...saved.events },
        custom_messages: { ...DEFAULT_SETTINGS.custom_messages, ...saved.custom_messages },
      });
    } else {
      setSettings({ ...DEFAULT_SETTINGS });
    }
  }

  async function save() {
    setSaving(true);
    const data = { ...settings, company_id: company.id };
    if (settingId) {
      await base44.entities.CustomerNotificationSetting.update(settingId, data);
    } else {
      const created = await base44.entities.CustomerNotificationSetting.create(data);
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

  function setCustomMessage(key, val) {
    setSettings(s => ({ ...s, custom_messages: { ...s.custom_messages, [key]: val } }));
  }

  if (!settings) return <div className="text-slate-400 py-8 text-center">Loading settings...</div>;
  if (!company) return <div className="text-slate-400 py-8 text-center">Select a company to configure customer notifications.</div>;

  const categories = [...new Set(EVENTS.map(e => e.category))];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        Configure which automated notifications your <strong>customers</strong> receive — such as booking confirmations, job updates, and invoice alerts.
      </div>

      {/* Master Toggle */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">Customer Notifications</p>
            <p className="text-sm text-slate-500">Globally enable or disable all customer-facing notifications</p>
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
              <CardDescription>How notifications are sent to customers</CardDescription>
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
              <CardDescription>Choose which events trigger a customer notification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {categories.map(cat => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{cat}</p>
                  <div className="space-y-1">
                    {EVENTS.filter(e => e.category === cat).map(({ key, label, description, hasMessage }) => (
                      <div key={key} className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-sm font-medium text-slate-700">{label}</p>
                            <p className="text-xs text-slate-400">{description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasMessage && settings.events[key] && (
                              <button
                                onClick={() => setExpandedMessage(expandedMessage === key ? null : key)}
                                className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                              >
                                Custom message
                                {expandedMessage === key ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                            <Switch checked={!!settings.events[key]} onCheckedChange={v => setEvent(key, v)} />
                          </div>
                        </div>
                        {hasMessage && settings.events[key] && expandedMessage === key && (
                          <div className="mt-3">
                            <Label className="text-xs text-slate-500 mb-1 block">Custom message (optional — leave blank to use default)</Label>
                            <Textarea
                              placeholder={`Default message will be used if left blank...`}
                              value={settings.custom_messages[key] || ""}
                              onChange={e => setCustomMessage(key, e.target.value)}
                              className="text-sm h-20 resize-none"
                            />
                          </div>
                        )}
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
        {saved ? <><CheckCircle className="w-4 h-4" />Saved!</> : saving ? "Saving..." : "Save Customer Notification Settings"}
      </Button>
    </div>
  );
}