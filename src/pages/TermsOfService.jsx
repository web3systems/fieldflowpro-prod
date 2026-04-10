import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link to="/" className="text-blue-600 text-sm hover:underline">← Back to Home</Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-400 text-sm mb-8">Last updated: April 2026</p>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using FieldFlow Pro ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Description of Service</h2>
              <p>FieldFlow Pro is a field service management platform that provides tools for job scheduling, customer management, invoicing, estimates, and related business operations for service companies.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Subscription and Billing</h2>
              <p>FieldFlow Pro offers subscription plans with a 14-day free trial. After the trial period, continued use requires a paid subscription. All payments are processed securely through Stripe. Subscriptions automatically renew unless cancelled before the renewal date.</p>
              <p className="mt-2">You may cancel your subscription at any time through the billing portal. Cancellation takes effect at the end of the current billing period. We do not offer refunds for partial months.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Your Data</h2>
              <p>You retain ownership of all data you input into FieldFlow Pro. We will not sell or share your business data with third parties. Upon account cancellation, your data will be retained for 30 days before permanent deletion, during which you may request an export.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Acceptable Use</h2>
              <p>You agree not to use FieldFlow Pro to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit spam or unsolicited communications</li>
                <li>Attempt to gain unauthorized access to the system</li>
                <li>Interfere with the service or other users' access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Service Availability</h2>
              <p>We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance when possible. We are not liable for downtime outside of our control.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Limitation of Liability</h2>
              <p>FieldFlow Pro shall not be liable for indirect, incidental, or consequential damages arising from your use of the service. Our total liability is limited to the amount you paid in the 12 months preceding the claim.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Changes to Terms</h2>
              <p>We reserve the right to update these terms. Significant changes will be communicated via email with 30 days notice. Continued use after the effective date constitutes acceptance.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Contact</h2>
              <p>For questions about these terms, contact us at <a href="mailto:support@fieldflowpro.com" className="text-blue-600 hover:underline">support@fieldflowpro.com</a>.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}