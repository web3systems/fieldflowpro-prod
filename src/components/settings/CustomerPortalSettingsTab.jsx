import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Info, Copy, Check, Pencil } from "lucide-react";

export default function CustomerPortalSettingsTab({ company, onSave }) {
  const portalSettings = company?.portal_settings || {};

  const [autoSendInvite, setAutoSendInvite] = useState(portalSettings.auto_send_invite !== false);
  const [includePortalLink, setIncludePortalLink] = useState(portalSettings.include_portal_link !== false);
  const [referralEnabled, setReferralEnabled] = useState(portalSettings.referral_enabled !== false);
  const [referralMessage, setReferralMessage] = useState(portalSettings.referral_message || "Share us with a friend and we'll take care of them just like we take care of you!");
  const [editingReferral, setEditingReferral] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const appDomain = window.location.host.replace(/:\d+$/, '');
  const baseUrl = `${window.location.protocol}//${appDomain}`;
  const portalUrl = `${baseUrl}/CustomerPortal`;

  const embedCode = `<!-- Customer Portal Button -->
<button onclick="window.open('${portalUrl}', '_blank')" style="background-color:${company?.primary_color || '#2563eb'};color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:14px;cursor:pointer;font-weight:600;">LOG IN TO PORTAL</button>`;

  async function saveSetting(field, value) {
    setSaving(true);
    const updated = {
      ...portalSettings,
      [field]: value,
    };
    await base44.entities.Company.update(company.id, { portal_settings: updated });
    if (onSave) onSave();
    setSaving(false);
  }

  async function saveReferralMessage() {
    setSaving(true);
    const updated = { ...portalSettings, referral_message: referralMessage };
    await base44.entities.Company.update(company.id, { portal_settings: updated });
    setEditingReferral(false);
    if (onSave) onSave();
    setSaving(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-xl font-bold text-slate-900">Customer Portal</h2>
        <p className="text-sm text-slate-500 mt-1">Customize how your customers view appointments, pay invoices, and send message requests</p>
      </div>

      <Tabs defaultValue="automations" className="w-full">
        <div className="px-6 border-b border-slate-200">
          <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none">
            <TabsTrigger value="automations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-4 py-3 text-sm font-medium">
              Portal automations
            </TabsTrigger>
            <TabsTrigger value="login_access" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-4 py-3 text-sm font-medium">
              Portal login access
            </TabsTrigger>
            <TabsTrigger value="referral" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 px-4 py-3 text-sm font-medium">
              Referral program
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Portal Automations */}
        <TabsContent value="automations" className="m-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Setting description</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    Automatically send the Customer Portal invite email when a job is scheduled
                    <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Switch
                      checked={autoSendInvite}
                      onCheckedChange={(val) => { setAutoSendInvite(val); saveSetting('auto_send_invite', val); }}
                      disabled={saving}
                    />
                    <span className="text-sm text-slate-600">{autoSendInvite ? "On" : "Off"}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    Automatically include the Customer Portal login link in job, invoice, and estimate emails.
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Switch
                      checked={includePortalLink}
                      onCheckedChange={(val) => { setIncludePortalLink(val); saveSetting('include_portal_link', val); }}
                      disabled={saving}
                    />
                    <span className="text-sm text-slate-600">{includePortalLink ? "On" : "Off"}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </TabsContent>

        {/* Portal Login Access */}
        <TabsContent value="login_access" className="m-0 px-6 py-6">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Embed code on your website</h3>
          <p className="text-sm text-blue-600 mb-4">Add this code to your site for a button that opens the Customer Portal request page.</p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-600 leading-relaxed whitespace-pre-wrap break-all mb-4">
            {embedCode}
          </div>
          <Button onClick={copyCode} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy code"}
          </Button>
        </TabsContent>

        {/* Referral Program */}
        <TabsContent value="referral" className="m-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Setting</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    Enable referral program for all customers using Customer Portal.
                    <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Switch
                      checked={referralEnabled}
                      onCheckedChange={(val) => { setReferralEnabled(val); saveSetting('referral_enabled', val); }}
                      disabled={saving}
                    />
                    <span className="text-sm text-slate-600">{referralEnabled ? "On" : "Off"}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-700">
                    Personalize the message your customers see above the referral link in their Customer Portal.
                    {editingReferral && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={referralMessage}
                          onChange={e => setReferralMessage(e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveReferralMessage} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingReferral(false)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                    {!editingReferral && (
                      <p className="mt-1 text-xs text-slate-400 italic">"{referralMessage}"</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right align-top">
                  {!editingReferral && (
                    <button onClick={() => setEditingReferral(true)} className="text-slate-500 hover:text-slate-800">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </TabsContent>
      </Tabs>
    </div>
  );
}