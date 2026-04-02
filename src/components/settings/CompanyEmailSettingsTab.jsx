import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, AlertTriangle, Mail, Server, Send, Loader2 } from 'lucide-react';

const PLATFORM_FALLBACK = 'notifications@fieldflowpro.com';

export default function CompanyEmailSettingsTab({ company }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [form, setForm] = useState({
    mail_method: 'resend',
    mail_enabled: false,
    mail_from_name: '',
    mail_from_address: '',
    mail_reply_to: '',
    mail_domain: '',
    mail_domain_verified: false,
    mail_fallback_allowed: true,
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_encryption: 'tls',
  });

  useEffect(() => {
    if (company?.id) loadSettings();
  }, [company?.id]);

  async function loadSettings() {
    setLoading(true);
    try {
      const results = await base44.entities.CompanyEmailSettings.filter({ company_id: company.id });
      if (results[0]) {
        setSettings(results[0]);
        setForm(f => ({ ...f, ...results[0] }));
      } else {
        setForm(f => ({ ...f, mail_from_name: company.name || '' }));
      }
    } catch (e) {
      console.error('Error loading email settings:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = { ...form, company_id: company.id };
      if (settings?.id) {
        await base44.entities.CompanyEmailSettings.update(settings.id, data);
      } else {
        const created = await base44.entities.CompanyEmailSettings.create(data);
        setSettings(created);
      }
      toast({ title: 'Email settings saved!' });
      await loadSettings();
    } catch (e) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    setTestSending(true);
    try {
      const user = await base44.auth.me();
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `Test email from ${company.name}`,
        body: `<p>This is a test email from <strong>${company.name}</strong> via FieldFlow Pro.</p><p>If you received this, your email settings are working correctly.</p>`,
        from_name: form.mail_from_name || company.name,
      });
      toast({ title: 'Test email sent!', description: `Check ${user.email}` });
    } catch (e) {
      toast({ title: 'Test failed', description: e.message, variant: 'destructive' });
    } finally {
      setTestSending(false);
    }
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  if (loading) return <div className="p-6 text-slate-500 text-sm">Loading email settings...</div>;

  const statusInfo = () => {
    if (!form.mail_enabled) return { label: 'Disabled', color: 'bg-slate-100 text-slate-600', icon: XCircle };
    if (!form.mail_from_address) return { label: 'Not Configured', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
    if (form.mail_domain_verified) return { label: 'Verified & Active', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    if (form.mail_fallback_allowed) return { label: 'Using Fallback', color: 'bg-blue-100 text-blue-700', icon: AlertTriangle };
    return { label: 'Domain Unverified', color: 'bg-red-100 text-red-700', icon: XCircle };
  };

  const status = statusInfo();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-5">
      {/* Status Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${form.mail_enabled ? 'border-slate-200 bg-slate-50' : 'border-amber-200 bg-amber-50'}`}>
        <StatusIcon className={`w-4 h-4 flex-shrink-0 ${form.mail_enabled && form.mail_domain_verified ? 'text-green-600' : 'text-amber-600'}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">Email Status: <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${status.color}`}>{status.label}</span></p>
          {form.mail_enabled && form.mail_fallback_allowed && !form.mail_domain_verified && (
            <p className="text-xs text-slate-500 mt-0.5">Emails are sending from <strong>{PLATFORM_FALLBACK}</strong> until your domain is verified.</p>
          )}
          {!form.mail_enabled && (
            <p className="text-xs text-slate-500 mt-0.5">Enable email sending below to start sending branded emails to customers.</p>
          )}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-slate-600 font-medium">Enabled</span>
          <div
            onClick={() => set('mail_enabled', !form.mail_enabled)}
            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.mail_enabled ? 'bg-green-500' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.mail_enabled ? 'left-5' : 'left-0.5'}`} />
          </div>
        </label>
      </div>

      {/* Method Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sending Method</CardTitle>
          <CardDescription>How emails are sent from your company</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => set('mail_method', 'resend')}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${form.mail_method === 'resend' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <Mail className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-slate-800">Managed Email</p>
                <p className="text-xs text-slate-500 mt-0.5">Powered by FieldFlow Pro via Resend. Easiest to set up.</p>
              </div>
            </button>
            <button
              onClick={() => set('mail_method', 'smtp')}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${form.mail_method === 'smtp' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <Server className="w-5 h-5 mt-0.5 text-slate-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-slate-800">Custom SMTP</p>
                <p className="text-xs text-slate-500 mt-0.5">Use your own mail server (Advanced)</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Sender Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sender Identity</CardTitle>
          <CardDescription>How your company appears in the "From" field</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>From Name</Label>
              <Input value={form.mail_from_name} onChange={e => set('mail_from_name', e.target.value)} placeholder={company.name} />
            </div>
            <div className="space-y-1.5">
              <Label>From Email</Label>
              <Input value={form.mail_from_address} onChange={e => set('mail_from_address', e.target.value)} placeholder="notifications@yourdomain.com" type="email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reply-To Email</Label>
            <Input value={form.mail_reply_to} onChange={e => set('mail_reply_to', e.target.value)} placeholder="office@yourdomain.com" type="email" />
            <p className="text-xs text-slate-400">Customers will reply to this address</p>
          </div>
        </CardContent>
      </Card>

      {/* Domain Verification (Resend only) */}
      {form.mail_method === 'resend' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Domain Verification</CardTitle>
                <CardDescription>Verify your domain to send from your own address</CardDescription>
              </div>
              {form.mail_domain_verified
                ? <Badge className="bg-green-100 text-green-700 border-green-200 border">✓ Verified</Badge>
                : <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Pending</Badge>
              }
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Sending Domain</Label>
              <Input value={form.mail_domain} onChange={e => set('mail_domain', e.target.value)} placeholder="yourdomain.com" />
            </div>

            {form.mail_domain && (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Required DNS Records</p>
                <p className="text-xs text-slate-500">Add these records to your domain's DNS settings, then verify in your Resend dashboard.</p>
                <div className="space-y-2">
                  {[
                    { type: 'TXT', name: `_resend.${form.mail_domain}`, value: 'Verify at resend.com/domains' },
                    { type: 'TXT', name: form.mail_domain, value: 'v=spf1 include:amazonses.com ~all' },
                    { type: 'CNAME', name: `resend._domainkey.${form.mail_domain}`, value: 'resend._domainkey.amazonses.com' },
                  ].map((rec, i) => (
                    <div key={i} className="font-mono text-xs bg-white border border-slate-200 rounded p-2 space-y-0.5">
                      <div className="flex gap-2">
                        <span className="text-slate-400">Type:</span>
                        <span className="font-semibold text-slate-700">{rec.type}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-400">Name:</span>
                        <span className="text-blue-700 break-all">{rec.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-400">Value:</span>
                        <span className="text-slate-700 break-all">{rec.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400">After adding DNS records, go to <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-blue-600 underline">resend.com/domains</a> to verify, then check "Domain Verified" below.</p>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.mail_domain_verified}
                onChange={e => set('mail_domain_verified', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Domain is verified in Resend</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.mail_fallback_allowed}
                onChange={e => set('mail_fallback_allowed', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">
                Use platform fallback ({PLATFORM_FALLBACK}) if domain not yet verified
              </span>
            </label>
          </CardContent>
        </Card>
      )}

      {/* SMTP Config */}
      {form.mail_method === 'smtp' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SMTP Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>SMTP Host</Label>
                <Input value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.mailgun.org" />
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input value={form.smtp_port} onChange={e => set('smtp_port', parseInt(e.target.value))} placeholder="587" type="number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={form.smtp_username} onChange={e => set('smtp_username', e.target.value)} placeholder="apikey or username" />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input value={form.smtp_password} onChange={e => set('smtp_password', e.target.value)} type="password" placeholder="••••••••" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Encryption</Label>
              <select
                value={form.smtp_encryption}
                onChange={e => set('smtp_encryption', e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="tls">TLS</option>
                <option value="starttls">STARTTLS</option>
                <option value="none">None</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Email Settings'}
        </Button>
        <Button variant="outline" onClick={handleTestEmail} disabled={testSending || !form.mail_enabled} className="gap-1.5">
          {testSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Test Email</>}
        </Button>
        {!form.mail_enabled && <p className="text-xs text-slate-400">Enable email sending to use the test button.</p>}
      </div>
    </div>
  );
}