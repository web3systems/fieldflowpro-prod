import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Megaphone, Send, CheckCircle, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function AnnouncementSender({ companies }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { sent, skipped }

  const toggleCompany = (id) => {
    setSelectedCompanyIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedCompanyIds.length === companies.length) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(companies.map(c => c.id));
    }
  };

  async function handleSend() {
    if (!subject || !message || selectedCompanyIds.length === 0) return;
    setSending(true);
    setResult(null);

    const response = await base44.functions.invoke('sendAnnouncement', {
      subject,
      message,
      company_ids: selectedCompanyIds,
    });

    setResult({ sent: response.data.sent, skipped: response.data.skipped });
    setSending(false);
  }

  const canSend = subject && message && selectedCompanyIds.length > 0 && !sending;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-4 py-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-500" />
            Broadcast Announcement
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">Send an email to all customers across selected businesses.</p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Company selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Businesses</Label>
              <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
                {selectedCompanyIds.length === companies.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {companies.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-100">
                  <Checkbox
                    checked={selectedCompanyIds.includes(c.id)}
                    onCheckedChange={() => toggleCompany(c.id)}
                  />
                  <div className="w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: c.primary_color || "#3b82f6" }}>
                    {c.name[0]}
                  </div>
                  <span className="text-sm font-medium truncate">{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label className="mb-1.5 block">Subject</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Important update from Honeydo Crew"
            />
          </div>

          {/* Message */}
          <div>
            <Label className="mb-1.5 block">Message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your announcement here..."
              className="min-h-[140px]"
            />
          </div>

          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Sent to <strong>{result.sent}</strong> customer{result.sent !== 1 ? "s" : ""}.
                {result.skipped > 0 && ` ${result.skipped} skipped (no email).`}
              </p>
            </div>
          )}

          <Button onClick={handleSend} disabled={!canSend} className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending..." : "Send Announcement"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}