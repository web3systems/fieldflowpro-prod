import { Link } from "react-router-dom";

export default function TermsAndConditions() {
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
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Terms &amp; Conditions</h2>
        <p className="text-slate-500 text-sm mb-8">Effective Date: June 30, 2026</p>

        <p className="text-slate-600 mb-8">
          These Terms &amp; Conditions govern your use of services provided by Parrow Enterprises LLC ("Company,"
          "we," "us," or "our"). By engaging our services or opting into our communications, you agree to these terms.
        </p>

        <Section title="1. Services">
          <p>
            Parrow Enterprises LLC provides handyman, residential cleaning, auto detailing, and landscaping services
            in Vermont under the trade names HoneyDo Crew, HoneyDo Cleaning, Pretty Little Polishers, and Kiss My Grass
            Landscaping. Service availability, pricing, and scope are subject to change and will be confirmed at the
            time of scheduling.
          </p>
        </Section>

        <Section title="2. SMS Terms">
          <p>
            By providing your mobile number and opting into SMS communications, you agree to receive automated text
            messages from Parrow Enterprises LLC. These messages may include appointment confirmations, job updates,
            and invoice notifications.
          </p>
          <p className="mt-3">
            Message frequency varies based on your service activity. Message and data rates may apply.
          </p>
          <p className="mt-3">
            Reply <strong>STOP</strong> to unsubscribe at any time. After opting out, you will no longer receive SMS
            messages from us. Reply <strong>HELP</strong> for assistance or contact us at tparrow78@gmail.com.
          </p>
        </Section>

        <Section title="3. SMS Opt-In">
          <p>
            Your consent to receive SMS messages is entirely voluntary. Consent is <strong>not</strong> a condition
            of purchasing or receiving any services from Parrow Enterprises LLC. You may request services without
            opting into SMS communications.
          </p>
        </Section>

        <Section title="4. Payment Terms">
          <p>
            Invoices are due upon receipt unless otherwise agreed in writing prior to service. We accept payment via
            cash, check, card, or electronic transfer. Late payments may be subject to additional fees. Deposits may
            be required for certain jobs prior to scheduling.
          </p>
        </Section>

        <Section title="5. Cancellation & Rescheduling">
          <p>
            We require a minimum of <strong>24 hours' notice</strong> for any cancellation or rescheduling of a
            scheduled service appointment. Cancellations made with less than 24 hours' notice may result in a
            cancellation fee. We reserve the right to reschedule appointments due to weather, equipment issues,
            or other circumstances beyond our control.
          </p>
        </Section>

        <Section title="6. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, Parrow Enterprises LLC shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising out of or related to the
            services provided. Our total liability to you for any claim arising from our services shall not exceed
            the amount paid by you for the specific service giving rise to the claim.
          </p>
          <p className="mt-3">
            We are not responsible for pre-existing conditions, normal wear and tear, or damages resulting from
            conditions outside our control.
          </p>
        </Section>

        <Section title="7. Governing Law">
          <p>
            These Terms &amp; Conditions shall be governed by and construed in accordance with the laws of the
            <strong> State of Vermont</strong>, without regard to its conflict of law provisions. Any disputes
            arising under these terms shall be subject to the exclusive jurisdiction of the courts located in
            Chittenden County, Vermont.
          </p>
        </Section>

        <Section title="8. Contact Us">
          <p>For questions about these Terms &amp; Conditions, please contact:</p>
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