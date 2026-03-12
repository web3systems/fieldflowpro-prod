import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, User } from "lucide-react";
import { format } from "date-fns";

export default function CustomerNotesSection({ job, customer, onNoteAdded }) {
  const [newNote, setNewNote] = useState("");
  const [sending, setSending] = useState(false);

  const notes = job?.customer_notes || [];

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSending(true);

    const user = await base44.auth.me();
    const note = {
      content: newNote.trim(),
      created_at: new Date().toISOString(),
      created_by: user?.full_name || user?.email || "Staff",
    };

    const updatedNotes = [...notes, note];
    await base44.entities.Job.update(job.id, { customer_notes: updatedNotes });

    // Email customer if they have an email
    if (customer?.email) {
      await base44.integrations.Core.SendEmail({
        to: customer.email,
        subject: `New update on your job: ${job.title}`,
        body: `Hi ${customer.first_name},\n\nYou have a new note from your service provider regarding your job "${job.title}":\n\n"${newNote.trim()}"\n\nIf you have any questions or would like to reply, please contact us directly.\n\nThank you!`,
      });
    }

    setNewNote("");
    setSending(false);
    if (onNoteAdded) onNoteAdded(updatedNotes);
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        Customer Notes
        <span className="text-xs font-normal text-slate-400">(customer gets emailed)</span>
      </Label>

      {notes.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes.map((note, i) => (
            <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-600">{note.created_by}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {note.created_at ? format(new Date(note.created_at), "MMM d, h:mm a") : ""}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {!job?.id ? (
        <p className="text-xs text-slate-400 italic">Save the job first to add customer notes.</p>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            rows={3}
            placeholder="Write a note for the customer..."
            className="text-sm"
          />
          <Button
            onClick={handleAddNote}
            disabled={sending || !newNote.trim()}
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending..." : customer?.email ? "Add Note & Notify Customer" : "Add Note"}
          </Button>
          {!customer?.email && (
            <p className="text-xs text-amber-600">No customer email on file — note will be saved without email.</p>
          )}
        </div>
      )}
    </div>
  );
}