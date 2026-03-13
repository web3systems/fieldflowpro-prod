import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp, CheckCircle, Mail, Phone, Bell, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CHANNEL_ICONS = { email: Mail, sms: Phone, in_app: Bell, slack: MessageSquare, whatsapp: MessageSquare };

const EVENTS = [
  { key: "new_job_assigned", label: "Job Assigned" },
  { key: "job_status_change", label: "Job Status Change" },
  { key: "job_reminder", label: "Job Reminder" },
  { key: "new_booking", label: "New Booking" },
  { key: "new_lead", label: "New Lead" },
  { key: "new_customer", label: "New Customer" },
  { key: "invoice_paid", label: "Invoice Paid" },
  { key: "invoice_overdue", label: "Invoice Overdue" },
  { key: "payment_received", label: "Payment Received" },
  { key: "estimate_approved", label: "Estimate Approved" },
];

const CHANNELS = ["email", "sms", "in_app", "slack", "whatsapp"];

const DEFAULT_SETTINGS = {
  is_enabled: true,
  channels: { email: true, sms: false, in_app: true, slack: false, whatsapp: false },
  events: {
    new_job_assigned: true, job_status_change: true, job_reminder: true,
    new_booking: true, new_lead: true, new_customer: false,
    invoice_paid: true, invoice_overdue: true, payment_received: true, estimate_approved: true,
  }
};

export default function AdminNotificationManager({ company, currentUser }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [settingsMap, setSettingsMap] = useState({}); // user_email -> { id, settings }
  const [expandedUser, setExpandedUser] = useState(null);
  const [savingUser, setSavingUser] = useState(null);
  const [savedUser, setSavedUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!company?.id) return;
    loadTeam();
  }, [company?.id]);

  async function loadTeam() {
    const [accessList, allSettings] = await Promise.all([
      base44.entities.UserCompanyAccess.filter({ company_id: company.id }),
      base44.entities.NotificationSetting.filter({ company_id: company.id })
    ]);
    setTeamMembers(accessList);
    const map = {};
    allSettings.forEach(s => {
      map[s.user_email] = {
        id: s.id,
        settings: { ...DEFAULT_SETTINGS, ...s, channels: { ...DEFAULT_SETTINGS.channels, ...s.channels }, events: { ...DEFAULT_SETTINGS.events, ...s.events } }
      };
    });
    setSettingsMap(map);
  }

  function getSettings(email) {
    return settingsMap[email]?.settings || { ...DEFAULT_SETTINGS };
  }

  function updateSettings(email, patch) {
    setSettingsMap(prev => ({
      ...prev,
      [email]: {
        ...prev[email],
        settings: { ...(prev[email]?.settings || DEFAULT_SETTINGS), ...patch }
      }
    }));
  }

  function updateChannel(email, channel, val) {
    const cur = getSettings(email);
    updateSettings(email, { channels: { ...cur.channels, [channel]: val } });
  }

  function updateEvent(email, event, val) {
    const cur = getSettings(email);
    updateSettings(email, { events: { ...cur.events, [event]: val } });
  }

  async function saveUser(member) {
    setSavingUser(member.user_email);
    const cur = settingsMap[member.user_email] || {};
    const data = {
      ...cur.settings,
      user_email: member.user_email,
      user_name: member.user_name,
      company_id: company.id,
    };
    if (cur.id) {
      await base44.entities.NotificationSetting.update(cur.id, data);
    } else {
      const created = await base44.entities.NotificationSetting.create(data);
      setSettingsMap(prev => ({ ...prev, [member.user_email]: { ...prev[member.user_email], id: created.id } }));
    }
    setSavingUser(null);
    setSavedUser(member.user_email);
    setTimeout(() => setSavedUser(null), 2000);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Configure notification preferences for each team member in <strong>{company?.name}</strong>.</p>

      {teamMembers.length === 0 && (
        <Card><CardContent className="p-8 text-center text-slate-400">No team members found for this company.</CardContent></Card>
      )}

      {teamMembers.map(member => {
        const s = getSettings(member.user_email);
        const isExpanded = expandedUser === member.user_email;
        const activeChannels = CHANNELS.filter(c => s.channels[c]);

        return (
          <Card key={member.user_email} className="overflow-hidden">
            <div
              className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedUser(isExpanded ? null : member.user_email)}
            >
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
                  {(member.user_name || member.user_email)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">{member.user_name || member.user_email}</p>
                <p className="text-xs text-slate-400 truncate">{member.user_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={s.is_enabled ? "default" : "secondary"} className="text-xs">
                  {s.is_enabled ? "Active" : "Muted"}
                </Badge>
                {activeChannels.map(c => {
                  const Icon = CHANNEL_ICONS[c];
                  return Icon ? <Icon key={c} className="w-3.5 h-3.5 text-slate-400" /> : null;
                })}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                {/* Master toggle */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Notifications Enabled</p>
                  <Switch checked={s.is_enabled} onCheckedChange={v => updateSettings(member.user_email, { is_enabled: v })} />
                </div>

                {s.is_enabled && (
                  <>
                    {/* Channels */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Channels</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {CHANNELS.map(c => {
                          const Icon = CHANNEL_ICONS[c];
                          return (
                            <div key={c} className="flex items-center justify-between bg-white rounded-lg border px-3 py-2">
                              <div className="flex items-center gap-2">
                                {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
                                <span className="text-xs font-medium text-slate-700 capitalize">{c.replace("_", " ")}</span>
                              </div>
                              <Switch
                                checked={!!s.channels[c]}
                                onCheckedChange={v => updateChannel(member.user_email, c, v)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Events */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Events</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {EVENTS.map(({ key, label }) => (
                          <div key={key} className="flex items-center justify-between bg-white rounded-lg border px-3 py-2">
                            <span className="text-xs text-slate-700">{label}</span>
                            <Switch
                              checked={!!s.events[key]}
                              onCheckedChange={v => updateEvent(member.user_email, key, v)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Button
                  size="sm"
                  onClick={() => saveUser(member)}
                  disabled={savingUser === member.user_email}
                  className="gap-1.5"
                >
                  {savedUser === member.user_email ? <><CheckCircle className="w-3.5 h-3.5" />Saved!</> : savingUser === member.user_email ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}