import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Briefcase, UserPlus, User } from "lucide-react";
import { format } from "date-fns";

const TABS = [
  { key: "all", label: "All" },
  { key: "customer", label: "Customer" },
  { key: "lead", label: "Leads" },
  { key: "estimate", label: "Estimates" },
  { key: "job", label: "Jobs" },
];

export default function CustomerNotes({ customerId, companyId, activities, onActivityAdded }) {
  const [tab, setTab] = useState("all");
  const [adding, setAdding] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    await base44.entities.Activity.create({
      company_id: companyId,
      type: "note",
      related_to_type: "customer",
      related_to_id: customerId,
      title: "Note",
      content: noteText.trim(),
    });
    setNoteText("");
    setAdding(false);
    setSaving(false);
    onActivityAdded();
  }

  const filtered = activities.filter(a => {
    if (tab === "all") return true;
    if (tab === "customer") return a.related_to_type === "customer";
    return a.related_to_type === tab;
  });

  const typeIcon = (type) => {
    switch(type) {
      case "lead": return <UserPlus className="w-3.5 h-3.5 text-purple-500" />;
      case "estimate": return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case "job": return <Briefcase className="w-3.5 h-3.5 text-green-500" />;
      default: return <User className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border-0 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Private notes</h3>
        <Button size="sm" onClick={() => setAdding(a => !a)} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 gap-1">
          <Plus className="w-3 h-3" /> Add customer note
        </Button>
      </div>

      {adding && (
        <div className="mb-3 space-y-2">
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Write a note..."
            rows={3}
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addNote} disabled={saving || !noteText.trim()} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
              {saving ? "Saving..." : "Save Note"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNoteText(""); }} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${tab === t.key ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(activity => (
            <div key={activity.id} className="flex gap-2.5 border-b border-slate-50 pb-3 last:border-0">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                {typeIcon(activity.related_to_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {activity.created_by_name && (
                    <span className="text-xs font-medium text-slate-700">{activity.created_by_name}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {activity.created_date ? format(new Date(activity.created_date), "MMM d, yyyy") : ""}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{activity.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}