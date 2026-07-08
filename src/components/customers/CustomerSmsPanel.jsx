import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CustomerSmsPanel({ customer }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // "sent" | "error" | null
  const [errorMsg, setErrorMsg] = useState("");

  const phone = customer?.phone;
  const hasPhone = !!phone;

  async function handleSend() {
    if (!message.trim() || !hasPhone) return;
    setSending(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("sendCustomerSms", {
        to_phone: phone,
        message: message.trim(),
      });
      if (res.data?.success) {
        setResult("sent");
        setMessage("");
      } else {
        setErrorMsg(res.data?.error || "Failed to send SMS.");
        setResult("error");
      }
    } catch (err) {
      setErrorMsg(err.message || "Unexpected error.");
      setResult("error");
    }
    setSending(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3">
        <MessageSquare className="w-4 h-4 text-slate-500" /> Send SMS
      </h3>

      {!hasPhone ? (
        <p className="text-sm text-slate-400 text-center py-2">No phone number on file for this customer.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">To: {phone}</p>
          <Textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setResult(null); }}
            placeholder="Type your message..."
            rows={3}
            className="text-sm resize-none"
            maxLength={1600}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{message.length}/1600</span>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="bg-blue-600 hover:bg-blue-700 gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? "Sending..." : "Send SMS"}
            </Button>
          </div>

          {result === "sent" && (
            <div className="flex items-center gap-1.5 text-green-700 text-xs bg-green-50 rounded-lg p-2">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Message sent successfully.
            </div>
          )}
          {result === "error" && (
            <div className="flex items-center gap-1.5 text-red-700 text-xs bg-red-50 rounded-lg p-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}