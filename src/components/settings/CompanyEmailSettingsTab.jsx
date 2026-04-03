import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Server, Send, Loader2, CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import EmailStatusBanner from './EmailStatusBanner';
import EmailDnsPanel from './EmailDnsPanel';
import EmailOnboardingStep from './EmailOnboardingStep';

export default function CompanyEmailSettingsTab({ company }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null
  const [showDnsPanel, setShowDnsPanel] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
        setShowOnboarding(false);
      } else {
        setForm(f => ({ ...f, mail_from_name: company.name || '' }));
        setShowOnboarding(true);
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
      toast({ title: 'Email settings saved successfully.' });
      await loadSettings();
    } catch (e) {
      toast({ title: 'Failed to save settings', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    setTestSending(true);
    setTestResult(null);
    try {
      const user = await base44.auth.me();
      const sendTo = testEmail || user.email;
      await base44.integrations.Core.SendEmail({
        to: sendTo,
        subject: `Test email from ${company.name}`,
        body: `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e293b;">Test Email — ${company.name}</h2>
          <p style="color:#475569;">If you received this email, your configuration is working correctly.</p>
          <p style="color:#475569;">Emails from <strong>${company.name}</strong> will be sent from: <strong>${form.mail_from_address || 'your configured address'}</strong></p>
        </div>`,
        from_name: form.mail_from_name || company.name,
      });
      setTestResult('success');
    } catch (e) {
      setTestResult('error');
    } finally {
      setTestSending(false);
    }
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading email settings…
      </div>
    );
  }

  // Show onboarding for new companies that haven't configured yet
  if (showOnboarding) {
    return (
      <div className="space-y-4">
        <EmailOnboardingStep
          onSetup={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Email Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Control how your company sends estimates, invoices, confirmations, and other customer emails.
        </p>
      </div>

      {/* Status Banner */}
      <EmailStatusBanner form={form} />

      {/* Enable Toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div>
          <p className="text-sm font-medium text-slate-800">Enable Email Sending</p>
          <p className="text-xs text-slate-500 mt-0.5">Turn this on to allow your company to send customer emails.</p>
        </div>
        <div
          onClick={() => set('mail_enabled', !form.mail_enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.mail_enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.mail_enabled ? 'left-6' : 'left-1'}`} />
        </div>
      </div>

      {/* ── Sending Method ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sending Method</CardTitle>
          <CardDescription>Choose how your company's emails are delivered.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            onClick={() => set('mail_method', 'resend')}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${form.mail_method === 'resend' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${form.mail_method === 'resend' ? 'bg-blue-600' : 'bg-slate-100'}`}>
              <Mail className={`w-4 h-4 ${form.mail_method === 'resend' ? 'text-white' : 'text-slate-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-slate-900">FieldFlowPro Managed Email</p>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-xs px-1.5 py-0">Recommended</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Use our built-in email delivery system with your business domain for the easiest setup and best experience. No server configuration needed.
              </p>
            </div>
            {form.mail_method === 'resend' && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />}
          </button>

          <button
            onClick={() => set('mail_method', 'smtp')}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${form.mail_method === 'smtp' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${form.mail_method === 'smtp' ? 'bg-blue-600' : 'bg-slate-100'}`}>
              <Server className={`w-4 h-4 ${form.mail_method === 'smtp' ? 'text-white' : 'text-slate-500'}`} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-slate-900">Custom SMTP</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Use your own email server if your company requires it. Advanced — may require assistance from your IT provider.
              </p>
            </div>
            {form.mail_method === 'smtp' && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />}
          </button>
        </CardContent>
      </Card>

      {/* ── Managed Email Setup ── */}
      {form.mail_method === 'resend' && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Managed Email Setup</CardTitle>
              <CardDescription>Configure how your emails appear to customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    value={form.mail_from_name}
                    onChange={e => set('mail_from_name', e.target.value)}
                    placeholder={company.name}
                  />
                  <p className="text-xs text-slate-400">The name customers will see in their inbox.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="from-email">From Email Address</Label>
                  <Input
                    id="from-email"
                    value={form.mail_from_address}
                    onChange={e => set('mail_from_address', e.target.value)}
                    placeholder="estimates@yourcompany.com"
                    type="email"
                  />
                  <p className="text-xs text-slate-400">Use your business domain — e.g. <em>estimates@yourcompany.com</em></p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reply-to">Reply-To Email Address</Label>
                <Input
                  id="reply-to"
                  value={form.mail_reply_to}
                  onChange={e => set('mail_reply_to', e.target.value)}
                  placeholder="office@yourcompany.com"
                  type="email"
                />
                <p className="text-xs text-slate-400">When a customer replies, their message will go here. Usually your main office inbox.</p>
              </div>
            </CardContent>
          </Card>

          {/* ── Domain Verification ── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Domain Verification</CardTitle>
                  <CardDescription>Verify your business domain to send from your own email address.</CardDescription>
                </div>
                {form.mail_domain_verified
                  ? <Badge className="bg-green-100 text-green-700 border border-green-200 gap-1"><ShieldCheck className="w-3 h-3" /> Verified</Badge>
                  : form.mail_domain
                    ? <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Verification Required</Badge>
                    : <Badge className="bg-slate-100 text-slate-500 border border-slate-200">Not Configured</Badge>
                }
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="domain">Business Domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    value={form.mail_domain}
                    onChange={e => { set('mail_domain', e.target.value); setShowDnsPanel(false); }}
                    placeholder="yourcompany.com"
                    className="flex-1"
                  />
                  {form.mail_domain && !form.mail_domain_verified && (
                    <Button
                      variant="outline"
                      onClick={() => setShowDnsPanel(!showDnsPanel)}
                      className="whitespace-nowrap"
                    >
                      {showDnsPanel ? 'Hide Records' : 'Verify Domain'}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-400">Enter the domain your business uses for email — e.g. <em>yourcompany.com</em></p>
              </div>

              {showDnsPanel && form.mail_domain && !form.mail_domain_verified && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <EmailDnsPanel
                    domain={form.mail_domain}
                    onVerify={() => {
                      set('mail_domain_verified', true);
                      setShowDnsPanel(false);
                      toast({ title: 'Domain marked as verified. Save your settings to apply.' });
                    }}
                    onLater={() => setShowDnsPanel(false)}
                  />
                </div>
              )}

              {form.mail_domain_verified && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>Your domain <strong>{form.mail_domain}</strong> is verified. Emails will send from your business address.</span>
                </div>
              )}

              {!form.mail_domain_verified && (
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.mail_domain_verified}
                      onChange={e => set('mail_domain_verified', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 mt-0.5"
                    />
                    <span className="text-sm text-slate-700">I've added the DNS records and my domain is verified in Resend</span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.mail_fallback_allowed}
                      onChange={e => set('mail_fallback_allowed', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 mt-0.5"
                    />
                    <div>
                      <span className="text-sm text-slate-700">Use FieldFlowPro as a fallback sender while my domain is being verified</span>
                      <p className="text-xs text-slate-400 mt-0.5">Your customers will still receive emails — they'll just come from the FieldFlowPro system address temporarily.</p>
                    </div>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── SMTP Settings ── */}
      {form.mail_method === 'smtp' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Custom SMTP Settings</CardTitle>
            <CardDescription>
              Use this option only if your company wants to send email through its own mail server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Custom SMTP requires correct mail server settings and may require assistance from your IT provider. If you're unsure, use Managed Email instead.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>From Name</Label>
                <Input value={form.mail_from_name} onChange={e => set('mail_from_name', e.target.value)} placeholder={company.name} />
                <p className="text-xs text-slate-400">The name customers will see in their inbox.</p>
              </div>
              <div className="space-y-1.5">
                <Label>From Email Address</Label>
                <Input value={form.mail_from_address} onChange={e => set('mail_from_address', e.target.value)} placeholder="estimates@yourcompany.com" type="email" />
                <p className="text-xs text-slate-400">Must match the email account on your SMTP server.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reply-To Email Address</Label>
              <Input value={form.mail_reply_to} onChange={e => set('mail_reply_to', e.target.value)} placeholder="office@yourcompany.com" type="email" />
              <p className="text-xs text-slate-400">When a customer replies, their message will go here.</p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <p className="text-sm font-semibold text-slate-700">Server Configuration</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>SMTP Host</Label>
                  <Input value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.mailgun.org" />
                  <p className="text-xs text-slate-400">Provided by your email host or IT team.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Port</Label>
                  <Input value={form.smtp_port} onChange={e => set('smtp_port', parseInt(e.target.value) || 587)} placeholder="587" type="number" />
                  <p className="text-xs text-slate-400">Usually 587 (TLS) or 465 (SSL).</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input value={form.smtp_username} onChange={e => set('smtp_username', e.target.value)} placeholder="Your SMTP username or API key" />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input value={form.smtp_password} onChange={e => set('smtp_password', e.target.value)} type="password" placeholder="••••••••" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Encryption Type</Label>
                <select
                  value={form.smtp_encryption}
                  onChange={e => set('smtp_encryption', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="tls">TLS (Recommended)</option>
                  <option value="starttls">STARTTLS</option>
                  <option value="none">None (Not Recommended)</option>
                </select>
                <p className="text-xs text-slate-400">TLS is the most secure option and works with most mail servers.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Save Button ── */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 px-6">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Email Settings'}
        </Button>
        {saving === false && settings?.id && (
          <p className="text-xs text-slate-400">Changes saved automatically when you click Save.</p>
        )}
      </div>

      {/* ── Send a Test Email ── */}
      {form.mail_enabled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Send a Test Email</CardTitle>
            <CardDescription>
              Confirm your settings are working correctly by sending yourself a test message.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="test-email">Send test email to</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="you@yourcompany.com"
              />
              <p className="text-xs text-slate-400">Leave blank to send to your account email address.</p>
            </div>

            <Button
              variant="outline"
              onClick={handleTestEmail}
              disabled={testSending}
              className="gap-2"
            >
              {testSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Test</>}
            </Button>

            {testResult === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Your test email was sent successfully.
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                We couldn't send the test email. Please review your email settings and try again.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}