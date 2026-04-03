import { AlertTriangle, XCircle, CheckCircle, Info } from 'lucide-react';

const PLATFORM_FALLBACK = 'notifications@fieldflowpro.com';

export default function EmailStatusBanner({ form }) {
  if (!form.mail_enabled) {
    return (
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-amber-200 bg-amber-50">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Email setup incomplete</p>
          <p className="text-sm text-amber-800 mt-0.5">
            Your company email settings are not fully configured. Branded sending may be unavailable until setup is completed.
          </p>
        </div>
      </div>
    );
  }

  if (!form.mail_from_address) {
    return (
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-amber-200 bg-amber-50">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Email setup incomplete</p>
          <p className="text-sm text-amber-800 mt-0.5">
            Please fill in your From address to complete email setup.
          </p>
        </div>
      </div>
    );
  }

  if (form.mail_domain_verified) {
    return (
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-green-200 bg-green-50">
        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-900">Email is active and verified</p>
          <p className="text-sm text-green-800 mt-0.5">
            Your business domain is verified. Estimates, invoices, and customer emails are sending from <strong>{form.mail_from_address}</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (form.mail_fallback_allowed) {
    return (
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-blue-200 bg-blue-50">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Temporary sending fallback is active</p>
          <p className="text-sm text-blue-800 mt-0.5">
            Some emails may be sent from the FieldFlowPro system domain (<strong>{PLATFORM_FALLBACK}</strong>) until your email setup is completed. Verify your domain below to send from your own address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-red-200 bg-red-50">
      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-900">Customer-facing email is currently disabled</p>
        <p className="text-sm text-red-800 mt-0.5">
          No valid sending configuration is available. Verify your domain or enable the fallback option to restore email sending.
        </p>
      </div>
    </div>
  );
}