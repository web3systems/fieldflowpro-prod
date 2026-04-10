import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link to="/" className="text-blue-600 text-sm hover:underline">← Back to Home</Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-400 text-sm mb-8">Last updated: April 2026</p>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Information We Collect</h2>
              <p>We collect information you provide when using FieldFlow Pro, including:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Account information: name, email, company name, phone number</li>
                <li>Business data: customer records, jobs, invoices, estimates</li>
                <li>Payment information (processed by Stripe — we do not store card details)</li>
                <li>Usage data: feature usage, login times, IP address</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Provide and improve the FieldFlow Pro service</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send transactional emails (invoices, job notifications, etc.)</li>
                <li>Respond to support requests</li>
                <li>Detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Data Sharing</h2>
              <p>We do not sell your data. We share data only with trusted service providers necessary to operate the platform:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Stripe</strong> — payment processing</li>
                <li><strong>Resend</strong> — transactional email delivery</li>
                <li><strong>Base44</strong> — cloud infrastructure and hosting</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Your Customer Data</h2>
              <p>Data about your customers (names, addresses, contact details) is yours. We act as a data processor on your behalf. We do not use your customers' data for any purpose other than providing the service to you.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Data Security</h2>
              <p>We use industry-standard encryption (TLS in transit, AES-256 at rest) and access controls. We conduct regular security reviews. No system is 100% secure — if you believe your data has been compromised, contact us immediately.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Data Retention</h2>
              <p>Your data is retained for as long as your account is active. Upon cancellation, data is retained for 30 days before deletion. You may request immediate deletion by contacting support.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Cookies</h2>
              <p>We use essential cookies for authentication and session management. We do not use third-party tracking cookies or advertising cookies.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Your Rights</h2>
              <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:privacy@fieldflowpro.com" className="text-blue-600 hover:underline">privacy@fieldflowpro.com</a>.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Changes to This Policy</h2>
              <p>We may update this policy periodically. We'll notify you of significant changes by email. Continued use after changes take effect constitutes acceptance.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Contact</h2>
              <p>Privacy questions: <a href="mailto:privacy@fieldflowpro.com" className="text-blue-600 hover:underline">privacy@fieldflowpro.com</a></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}