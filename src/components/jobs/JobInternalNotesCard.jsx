import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Lock, Sparkles, User } from "lucide-react";
import AIAssistantPanel from "@/components/ai/AIAssistantPanel";
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

export default function JobInternalNotesCard({ job, customer, onInternalNoteAdded }) {
  const [expanded, setExpanded] = useState(true);
  const [internalNote, setInternalNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const internalLog = job?.internal_notes_log || [];
  const legacyNote = (!internalLog.length && job?.internal_notes)
    ? [{ content: job.internal_notes, created_at: job.created_date, created_by: "Staff" }]
    : [];
  const internalEntries = [...legacyNote, ...internalLog];

  async function saveInternalNote() {
    if (!internalNote.trim()) return;
    setSaving(true);
    const user = await base44.auth.me();
    const entry = { content: internalNote.trim(), created_at: new Date().toISOString(), created_by: user?.full_name || user?.email || "Staff" };
    const updated = [...internalLog, entry];
    await base44.entities.Job.update(job.id, { internal_notes_log: updated });
    setInternalNote("");
    setSaving(false);
    if (onInternalNoteAdded) onInternalNoteAdded(updated);
  }

  async function handleAINote(noteText) {
    if (!noteText) return;
    setSaving(true);
    const user = await base44.auth.me();
    const entry = { content: noteText, created_at: new Date().toISOString(), created_by: (user?.full_name || user?.email || "AI Assistant") + " (AI)" };
    const updated = [...internalLog, entry];
    await base44.entities.Job.update(job.id, { internal_notes_log: updated });
    setSaving(false);
    if (onInternalNoteAdded) onInternalNoteAdded(updated);
  }

  return (
    <>
      {showAI && (
        <AIAssistantPanel
          mode="job_notes"
          context={{ job, customer }}
          onApplyNotes={handleAINote}
          onClose={() => setShowAI(false)}
        />
      )}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-slate-800">Private notes</h3>
            <span className="text-xs text-slate-400">(not visible to customer)</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); setShowAI(true); }} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200">
              <Sparkles className="w-3 h-3" /> AI Notes
            </button>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
        {expanded && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-3">
            {internalEntries.map((e, i) => <NoteBlock key={i} entry={e} colorClass="bg-slate-50 border-slate-200 text-slate-700" />)}
            <Textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2} placeholder="Add a private note..." className="text-sm" />
            <Button size="sm" onClick={saveInternalNote} disabled={saving || !internalNote.trim()} variant="outline" className="gap-1">
              <Plus className="w-3.5 h-3.5" />{saving ? "Saving..." : "Add Note"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}