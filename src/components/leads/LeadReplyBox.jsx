import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mail, MessageSquare, Send } from "lucide-react";

export default function LeadReplyBox({ lead }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("sms");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const noPhone = !lead?.phone;
  const noEmail = !lead?.email;

  // Default to whichever contact method is available
  if (!open && typeof method === "string") {
    // no-op
  }

  async function send() {
    if (!message.trim()) return;
    if (method === "email" && !subject.trim()) {
      setError("Please add a subject for the email.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await base44.functions.invoke("sendLeadReply", {
        lead_id: lead.id,
        contact_method: method,
        message: message.trim(),
        subject: subject.trim(),
      });
      if (res?.data?.error) throw new Error(res.data.error);
      setMessage("");
      setSubject("");
      setOpen(false);
      // Refresh activities
      window.dispatchEvent(new CustomEvent("lead-activity-refresh"));
    } catch (e) {
      setError(e.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border-0 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Reply to Lead</h3>
        {!open && (
          <Button size="sm" onClick={() => {
            if (noPhone && noEmail) return;
            setMethod(noPhone ? "email" : "sms");
            setOpen(true);
          }} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 gap-1" disabled={noPhone && noEmail}>
            <Send className="w-3 h-3" /> Reply
          </Button>
        )}
      </div>

      {noPhone && noEmail && !open && (
        <p className="text-xs text-slate-400">Add a phone or email to this lead to reply.</p>
      )}

      {open && (
        <div className="space-y-3">
          {/* Method toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMethod("sms")}
              disabled={noPhone}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                method === "sms" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> SMS {noPhone && "(no phone)"}
            </button>
            <button
              onClick={() => setMethod("email")}
              disabled={noEmail}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                method === "email" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Email {noEmail && "(no email)"}
            </button>
          </div>

          {method === "email" && (
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="text-sm h-8"
            />
          )}

          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={method === "sms" ? "Type your text message..." : "Type your email..."}
            rows={4}
            className="text-sm"
            autoFocus
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={send} disabled={sending || !message.trim()} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 gap-1">
              {sending ? "Sending..." : <><Send className="w-3 h-3" /> Send</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); setMessage(""); setSubject(""); setError(""); }} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}