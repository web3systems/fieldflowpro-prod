import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Star, Mail, MessageSquare, X, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RequestReviewModal({ open, onClose, customer, job, company }) {
  const [method, setMethod] = useState("email");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  if (!open) return null;

  const customerName = customer?.business_name || `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() || "Customer";
  const jobTitle = job?.title || "your recent service";
  const companyName = company?.name || "us";

  const emailPreview = `Hi ${customer?.first_name || customerName}, thank you for choosing ${companyName} for "${jobTitle}". We'd love your feedback — could you leave us a quick review?`;
  const smsPreview = `Hi ${customer?.first_name || customerName}! Thanks for choosing ${companyName} for "${jobTitle}". We'd love your feedback! ${company?.google_review_url || "Please let us know how we did."}`;

  async function handleSend() {
    if (method === "email" && !customer?.email) {
      toast({ title: "No email on file for this customer.", variant: "destructive" });
      return;
    }
    if (method === "sms" && !customer?.phone) {
      toast({ title: "No phone number on file for this customer.", variant: "destructive" });
      return;
    }
    if (method === "both" && !customer?.email && !customer?.phone) {
      toast({ title: "No email or phone on file for this customer.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Send via backend
      await base44.functions.invoke("sendReviewRequest", {
        job_id: job?.id,
        customer_id: customer?.id,
        company_id: company?.id,
        method,
      });

      // Store the review request in the app
      await base44.entities.Review.create({
        company_id: company?.id,
        customer_id: customer?.id,
        job_id: job?.id || null,
        customer_name: customerName,
        sent_via: method,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      toast({ title: "Review request sent!", description: `Sent via ${method === "both" ? "email & SMS" : method}.` });
      onClose();
    } catch (err) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">Request a Review</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer info */}
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-slate-800">{customerName}</p>
            <div className="flex gap-3 mt-1">
              {customer?.email && <p className="text-xs text-slate-500">✉ {customer.email}</p>}
              {customer?.phone && <p className="text-xs text-slate-500">📱 {customer.phone}</p>}
            </div>
            {job && <p className="text-xs text-slate-400 mt-1">Job: {job.title}</p>}
          </div>

          {/* Send method */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Send via</p>
            <div className="flex gap-2">
              {[
                { value: "email", label: "Email", icon: Mail },
                { value: "sms", label: "SMS", icon: MessageSquare },
                { value: "both", label: "Both", icon: Send },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setMethod(value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    method === value
                      ? "bg-blue-600 text-white border-blue-600 shadow"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Message Preview</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 leading-relaxed">
              {method === "email" || method === "both" ? (
                <p>{emailPreview}</p>
              ) : null}
              {method === "sms" ? (
                <p>{smsPreview}</p>
              ) : null}
              {method === "both" && (
                <>
                  <p className="text-xs text-slate-400 mt-2 font-medium">SMS version:</p>
                  <p className="mt-1">{smsPreview}</p>
                </>
              )}
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-slate-400 text-center">
            The review will be stored in the customer's profile. Google & Facebook sending coming soon.
          </p>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={handleSend} disabled={sending}>
            <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}