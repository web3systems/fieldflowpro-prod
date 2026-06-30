import { Link } from "react-router-dom";

export default function PrivacyPolicyPublic() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold tracking-tight">Parrow Enterprises LLC</h1>
          <p className="text-slate-400 text-sm mt-1">HoneyDo Crew · HoneyDo Cleaning · Pretty Little Polishers · Kiss My Grass Landscaping</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h2>
        <p className="text-slate-500 text-sm mb-8">Effective Date: June 30, 2026</p>

        <p className="text-slate-600 mb-8">
          This Privacy Policy describes how Parrow Enterprises LLC (doing business as HoneyDo Crew, HoneyDo Cleaning,
          Pretty Little Polishers, and Kiss My Grass Landscaping), located at 7 Hunting Ridge Lane, Milton, VT 05468,
          collects, uses, and protects your personal information.
        </p>

        <Section title="1. Information We Collect">
          <p>We collect the following information when you contact us, request services, or opt in to communications:</p>
          <ul>
            <li>Full name</li>
            <li>Phone number</li>
            <li>Email address</li>
            <li>Service address</li>
            <li>Service details and job history</li>
            <li>SMS opt-in consent and communication preferences</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use your information to:</p>
          <ul>
            <li>Schedule and coordinate service appointments</li>
            <li>Send invoices and process payments</li>
            <li>Provide job status updates and service communications</li>
            <li>Send SMS notifications including dispatch confirmations, appointment reminders, and invoice alerts</li>
            <li>Respond to questions and support requests</li>
          </ul>
        </Section>

        <Section title="3. SMS Communications">
          <p>
            By providing your phone number and opting in, you consent to receive SMS messages from Parrow Enterprises LLC
            regarding your service appointments, job status updates, and invoice reminders. Message and data rates may apply.
            Message frequency varies based on your service activity.
          </p>
          <p className="mt-3">
            You may opt out at any time by replying <strong>STOP</strong> to any message. Reply <strong>HELP</strong> for
            assistance. Opting out will not affect your ability to receive services.
          </p>
          <p className="mt-3">
            SMS messages are delivered through Twilio, our SMS service provider. Your phone number will not be used for
            any purpose other than the communications described above.
          </p>
        </Section>

        <Section title="4. Information Sharing">
          <p>
            We do not sell, rent, or share your personal information with third parties for marketing purposes.
            We may share your information only with service providers who assist in delivering our services, including:
          </p>
          <ul>
            <li><strong>Twilio</strong> — for SMS message delivery</li>
          </ul>
          <p className="mt-3">
            These providers are contractually obligated to protect your information and use it only for the purposes
            we specify.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your personal information for a minimum of three (3) years for billing, legal, and operational
            purposes. After this period, records may be securely deleted or anonymized.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Request corrections to inaccurate information</li>
            <li>Request deletion of your personal data (subject to legal retention requirements)</li>
            <li>Opt out of SMS communications at any time by replying STOP</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, please contact us at the information below.
          </p>
        </Section>

        <Section title="7. Contact Us">
          <p>If you have questions about this Privacy Policy or your personal data, please contact:</p>
          <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="font-semibold text-slate-800">Parrow Enterprises LLC</p>
            <p className="text-slate-600 mt-1">7 Hunting Ridge Lane, Milton, VT 05468</p>
            <p className="text-slate-600 mt-1">
              <a href="mailto:tparrow78@gmail.com" className="text-blue-600 hover:underline">tparrow78@gmail.com</a>
            </p>
            <p className="text-slate-600 mt-1">
              <a href="tel:+18024554584" className="text-blue-600 hover:underline">(802) 455-4584</a>
            </p>
          </div>
        </Section>
      </div>

      <Footer />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">{title}</h3>
      <div className="text-slate-600 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1 [&_ul]:mt-2">
        {children}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 py-6 mt-10">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <p className="text-slate-400 text-sm">
          © {new Date().getFullYear()} Parrow Enterprises LLC · All rights reserved
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/privacy" className="text-blue-600 text-sm hover:underline">Privacy Policy</Link>
          <span className="text-slate-300">|</span>
          <Link to="/terms" className="text-blue-600 text-sm hover:underline">Terms &amp; Conditions</Link>
        </div>
      </div>
    </footer>
  );
}