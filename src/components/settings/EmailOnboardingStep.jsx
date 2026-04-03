import { CheckCircle, Mail, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const CHECKLIST = [
  'Send from your business domain',
  'Use your branded From address',
  'Route replies to your real inbox',
  'Improve trust and deliverability',
];

export default function EmailOnboardingStep({ onSetup, onSkip }) {
  const [skipped, setSkipped] = useState(false);

  function handleSkip() {
    setSkipped(true);
    onSkip?.();
  }

  if (skipped) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Your company can still use FieldFlowPro, but branded emails may be unavailable until email setup is completed.{' '}
          <button onClick={() => setSkipped(false)} className="underline font-medium hover:no-underline">
            Set up email
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-0.5">Email Setup</p>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Send estimates and invoices from your own business email
          </h2>
        </div>
      </div>

      <p className="text-slate-600 text-sm leading-relaxed mb-6 max-w-xl">
        Build trust, improve deliverability, and make it easier for customers to recognize and reply to your emails.
        When your emails come from your own business domain, customers are more likely to open them, trust them, and respond quickly.
      </p>

      <ul className="space-y-2.5 mb-8">
        {CHECKLIST.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
            <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onSetup}
          className="bg-blue-600 hover:bg-blue-700 gap-2 px-6"
        >
          Set Up Email <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-slate-500 hover:text-slate-700"
        >
          Skip for Now
        </Button>
      </div>
    </div>
  );
}