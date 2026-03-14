import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lock, Plus, User } from "lucide-react";
import { format } from "date-fns";

export default function InternalNotesSection({ job, onNoteAdded }) {
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Support legacy string internal_notes by showing it as first entry if log is empty
  const log = job?.internal_notes_log || [];
  const legacyNote = (!log.length && job?.internal_notes)
    ? [{ content: job.internal_notes, created_at: job.created_date, created_by: "Staff" }]
    : [];
  const entries = [...legacyNote, ...log];

  async function handleSave() {
    if (!newNote.trim()) return;
    setSaving(true);
    const user = await base44.auth.me();
    const entry = {
      content: newNote.trim(),
      created_at: new Date().toISOString(),
      created_by: user?.full_name || user?.email || "Staff",
    };
    const updatedLog = [...log, entry];
    await base44.entities.Job.update(job.id, { internal_notes_log: updatedLog });
    setNewNote("");
    setSaving(false);
    if (onNoteAdded) onNoteAdded(updatedLog);
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Lock className="w-4 h-4 text-slate-400" />
        Internal Notes
        <span className="text-xs font-normal text-slate-400">(not visible to customer)</span>
      </Label>

      {entries.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {entries.map((entry, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-slate-400" />
                <span className="text-xs font-medium text-slate-600">{entry.created_by}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {entry.created_at ? format(new Date(entry.created_at), "MMM d, h:mm a") : ""}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.content}</p>
            </div>
          ))}
        </div>
      )}

      {!job?.id ? (
        <p className="text-xs text-slate-400 italic">Save the job first to add notes.</p>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            rows={3}
            placeholder="Add an internal note for your team..."
            className="text-sm"
          />
          <Button
            onClick={handleSave}
            disabled={saving || !newNote.trim()}
            size="sm"
            className="gap-2"
            variant="outline"
          >
            <Plus className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Add Internal Note"}
          </Button>
        </div>
      )}
    </div>
  );
}