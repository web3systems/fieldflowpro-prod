import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Send, User, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

function NoteBlock({ entry, colorClass }) {
  return (
    <div className={`rounded-lg p-3 border ${colorClass}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <User className="w-3 h-3 opacity-60" />
        <span className="text-xs font-medium">{entry.created_by}</span>
        <span className="text-xs text-slate-400 ml-auto">
          {entry.created_at ? format(new Date(entry.created_at), "MMM d, h:mm a") : ""}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
    </div>
  );
}

export default function JobCustomerNotesCard({ job, customer, onCustomerNoteAdded }) {
  const [expanded, setExpanded] = useState(true);
  const [customerNote, setCustomerNote] = useState("");
  const [saving, setSaving] = useState(false);

  const customerNotes = job?.customer_notes || [];

  async function saveCustomerNote() {
    if (!customerNote.trim()) return;
    setSaving(true);
    const user = await base44.auth.me();
    const note = { content: customerNote.trim(), created_at: new Date().toISOString(), created_by: user?.full_name || user?.email || "Staff" };
    const updated = [...customerNotes, note];
    await base44.entities.Job.update(job.id, { customer_notes: updated });
    if (customer?.email) {
      await base44.functions.invoke("sendJobNote", {
        job_id: job.id,
        customer_id: customer.id,
        note_content: customerNote.trim(),
        company_id: job.company_id,
      });
    }
    setCustomerNote("");
    setSaving(false);
    if (onCustomerNoteAdded) onCustomerNoteAdded(updated);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-slate-800">Customer notes</h3>
          <span className="text-xs text-slate-400">(customer gets notified)</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3">
          {customerNotes.map((n, i) => <NoteBlock key={i} entry={n} colorClass="bg-blue-50 border-blue-100 text-slate-700" />)}
          <Textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} rows={2} placeholder="Write a note for the customer..." className="text-sm" />
          <Button size="sm" onClick={saveCustomerNote} disabled={saving || !customerNote.trim()} className="gap-1 bg-blue-600 hover:bg-blue-700">
            <Send className="w-3.5 h-3.5" />{saving ? "Sending..." : "Add Note & Notify Customer"}
          </Button>
        </div>
      )}
    </div>
  );
}