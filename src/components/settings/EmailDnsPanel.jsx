import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DNS_RECORDS = (domain) => [
  {
    type: 'TXT',
    name: `_resend.${domain}`,
    value: 'resend-verification=your-verification-code',
    label: 'Verification Record',
    note: 'Your unique verification code appears in your Resend dashboard.',
  },
  {
    type: 'TXT',
    name: domain,
    value: 'v=spf1 include:amazonses.com ~all',
    label: 'SPF Record',
    note: 'Tells email providers that FieldFlowPro is authorized to send on your behalf.',
  },
  {
    type: 'CNAME',
    name: `resend._domainkey.${domain}`,
    value: 'resend._domainkey.amazonses.com',
    label: 'DKIM Record',
    note: 'Used to cryptographically sign your emails for better deliverability.',
  },
];

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-auto p-1 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-700 flex-shrink-0"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function EmailDnsPanel({ domain, onVerify, onLater }) {
  const [allCopied, setAllCopied] = useState(false);
  const records = DNS_RECORDS(domain);

  function copyAll() {
    const text = records.map(r => `${r.type}\t${r.name}\t${r.value}`).join('\n');
    navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Verify Your Domain</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          To send email from your business domain, you need to add a few DNS records with your domain provider.
          This tells email providers that FieldFlowPro is allowed to send email on behalf of your business.
        </p>
      </div>

      {/* Steps */}
      <ol className="space-y-2">
        {[
          'Log in to your domain provider (e.g. GoDaddy, Namecheap, Cloudflare)',
          `Open DNS settings for ${domain}`,
          'Copy and add the records shown below',
          'Save your changes',
          'Return here and click Verify Domain',
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      {/* DNS Records */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-700">DNS Records for <span className="text-blue-700">{domain}</span></p>
          <Button variant="outline" size="sm" onClick={copyAll} className="gap-1.5 text-xs h-7">
            {allCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy All Records</>}
          </Button>
        </div>
        <div className="divide-y divide-slate-200">
          {records.map((rec, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{rec.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-semibold ${rec.type === 'TXT' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>{rec.type}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-400 w-10 flex-shrink-0">Name</span>
                  <span className="font-mono text-xs text-slate-700 break-all flex-1">{rec.name}</span>
                  <CopyButton value={rec.name} />
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-400 w-10 flex-shrink-0">Value</span>
                  <span className="font-mono text-xs text-slate-700 break-all flex-1">{rec.value}</span>
                  <CopyButton value={rec.value} />
                </div>
              </div>
              <p className="text-xs text-slate-400 italic">{rec.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-slate-400 leading-relaxed">
        DNS changes can take some time to update. In some cases, verification may take a few minutes or longer — this is normal. You can return here to check status at any time.
      </p>

      {/* Resend link */}
      <a
        href="https://resend.com/domains"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
      >
        Open Resend Domain Dashboard <ExternalLink className="w-3.5 h-3.5" />
      </a>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-1">
        <Button onClick={onVerify} className="bg-blue-600 hover:bg-blue-700">
          Verify Domain
        </Button>
        <Button variant="outline" onClick={onLater} className="text-slate-600">
          I'll Do This Later
        </Button>
      </div>
    </div>
  );
}