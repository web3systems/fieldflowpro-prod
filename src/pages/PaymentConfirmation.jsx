import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function PaymentConfirmation() {
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("job_id");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Received!</h1>
        <p className="text-slate-500 mb-8">
          Thank you — your deposit payment was successful. We'll be in touch shortly to confirm your appointment.
        </p>
        {jobId ? (
          <Link
            to={`/JobDetail/${jobId}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Job Details
          </Link>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}