import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react";

export default function UserNotRegisteredError() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  async function handleRequest() {
    setSubmitting(true);
    try {
      const u = await base44.auth.me().catch(() => null);
      const userEmail = u?.email || email;
      const userName = u?.full_name || name;
      // Check if request already exists
      const existing = await base44.entities.AccessRequest.filter({ email: userEmail, status: "pending" });
      if (existing.length === 0) {
        await base44.entities.AccessRequest.create({ email: userEmail, name: userName, message, status: "pending" });
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-slate-100 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-green-100">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Request Sent!</h1>
          <p className="text-slate-500">Your access request has been submitted. An administrator will review it shortly and you'll receive an invitation email once approved.</p>
          <Button className="mt-6" variant="outline" onClick={() => base44.auth.logout()}>Sign Out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-slate-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-orange-100">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Access Required</h1>
          <p className="text-slate-500 mt-2 text-sm">You don't have access yet. Request access and an admin will review your request.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Your Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email (if not auto-detected)</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Message (optional)</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell the admin why you need access..." rows={3} />
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleRequest}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Request Access"}
          </Button>
          <Button variant="ghost" className="w-full text-slate-500" onClick={() => base44.auth.logout()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}