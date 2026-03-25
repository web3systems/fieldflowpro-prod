import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Lock, MessageSquare, Send, User } from "lucide-react";
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

export default function JobNotesSection({ job, customer, onInternalNoteAdded, onCustomerNoteAdded }) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const [customerExpanded, setCustomerExpanded] = useState(true);
  const [internalNote, setInternalNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [savingInternal, setSavingInternal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const internalLog = job?.internal_notes_log || [];
  const legacyNote = (!internalLog.length && job?.internal_notes)
    ? [{ content: job.internal_notes, created_at: job.created_date, created_by: "Staff" }]
    : [];
  const internalEntries = [...legacyNote, ...internalLog];
  const customerNotes = job?.customer_notes || [];

  async function saveInternalNote() {
    if (!internalNote.trim()) return;
    setSavingInternal(true);
    const user = await base44.auth.me();
    const entry = { content: internalNote.trim(), created_at: new Date().toISOString(), created_by: user?.full_name || user?.email || "Staff" };
    const updated = [...internalLog, entry];
    await base44.entities.Job.update(job.id, { internal_notes_log: updated });
    setInternalNote("");
    setSavingInternal(false);
    if (onInternalNoteAdded) onInternalNoteAdded(updated);
  }

  async function saveCustomerNote() {
    if (!customerNote.trim()) return;
    setSavingCustomer(true);
    const user = await base44.auth.me();
    const note = { content: customerNote.trim(), created_at: new Date().toISOString(), created_by: user?.full_name || user?.email || "Staff" };
    const updated = [...customerNotes, note];
    await base44.entities.Job.update(job.id, { customer_notes: updated });
    if (customer?.email) {
      await base44.integrations.Core.SendEmail({
        to: customer.email,
        subject: `Update on your job: ${job.title}`,
        body: `Hi ${customer.first_name},\n\nNew update on your job "${job.title}":\n\n"${customerNote.trim()}"\n\nThank you!`,
      });
    }
    setCustomerNote("");
    setSavingCustomer(false);
    if (onCustomerNoteAdded) onCustomerNoteAdded(updated);
  }

  return (
    <>
      {/* Internal Notes */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setInternalExpanded(!internalExpanded)}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-slate-800">Private notes</h3>
            <span className="text-xs text-slate-400">(not visible to customer)</span>
          </div>
          {internalExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {internalExpanded && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-3">
            {internalEntries.map((e, i) => <NoteBlock key={i} entry={e} colorClass="bg-slate-50 border-slate-200 text-slate-700" />)}
            <Textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2} placeholder="Add a private note..." className="text-sm" />
            <Button size="sm" onClick={saveInternalNote} disabled={savingInternal || !internalNote.trim()} variant="outline" className="gap-1">
              <Plus className="w-3.5 h-3.5" />{savingInternal ? "Saving..." : "Add Note"}
            </Button>
          </div>
        )}
      </div>

      {/* Customer Notes */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setCustomerExpanded(!customerExpanded)}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-slate-800">Customer notes</h3>
            <span className="text-xs text-slate-400">(customer gets notified)</span>
          </div>
          {customerExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {customerExpanded && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-3">
            {customerNotes.map((n, i) => <NoteBlock key={i} entry={n} colorClass="bg-blue-50 border-blue-100 text-slate-700" />)}
            <Textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} rows={2} placeholder="Write a note for the customer..." className="text-sm" />
            <Button size="sm" onClick={saveCustomerNote} disabled={savingCustomer || !customerNote.trim()} className="gap-1 bg-blue-600 hover:bg-blue-700">
              <Send className="w-3.5 h-3.5" />{savingCustomer ? "Sending..." : "Add Note & Notify Customer"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}