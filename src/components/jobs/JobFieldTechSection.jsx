import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function JobFieldTechSection({ form, setForm, techs, onSave }) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedTech, setSelectedTech] = useState("");

  const assignedTechs = form.assigned_techs || [];
  const assignedTechObjects = assignedTechs.map(id => techs.find(t => t.id === id)).filter(Boolean);
  const availableTechs = techs.filter(t => !assignedTechs.includes(t.id));

  async function addTech() {
    if (!selectedTech) return;
    const updated = [...assignedTechs, selectedTech];
    setForm(f => ({ ...f, assigned_techs: updated }));
    await base44.entities.Job.update(form.id, { assigned_techs: updated });
    setSelectedTech("");
    setAdding(false);
  }

  async function removeTech(techId) {
    const updated = assignedTechs.filter(id => id !== techId);
    setForm(f => ({ ...f, assigned_techs: updated }));
    await base44.entities.Job.update(form.id, { assigned_techs: updated });
  }

  function getInitials(tech) {
    return `${tech.first_name?.[0] || ""}${tech.last_name?.[0] || ""}`.toUpperCase();
  }

  const TECH_COLORS = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-rose-500"];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800">Field tech status</h3>
          {assignedTechObjects.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{assignedTechObjects.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); setAdding(true); setExpanded(true); }}>
            <Plus className="w-3 h-3" /> Assign Tech
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {/* Table header */}
          {assignedTechObjects.length > 0 && (
            <div className="grid grid-cols-5 gap-2 px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <div className="col-span-2">Employee name</div>
              <div>Status</div>
              <div>Travel time</div>
              <div>Time on job</div>
            </div>
          )}
          {assignedTechObjects.map((tech, i) => (
            <div key={tech.id} className="grid grid-cols-5 gap-2 px-5 py-3 border-b border-slate-50 items-center last:border-0">
              <div className="col-span-2 flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full ${TECH_COLORS[i % TECH_COLORS.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {getInitials(tech)}
                </div>
                <span className="text-sm text-slate-700">{tech.first_name} {tech.last_name}</span>
                <button onClick={() => removeTech(tech.id)} className="ml-auto text-slate-300 hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <Badge className="bg-blue-100 text-blue-700 text-xs">Assigned</Badge>
              </div>
              <div className="text-sm text-slate-400">—</div>
              <div className="text-sm text-slate-400">—</div>
            </div>
          ))}

          {assignedTechObjects.length === 0 && !adding && (
            <p className="text-sm text-slate-400 italic px-5 py-4">No technicians assigned yet.</p>
          )}

          {adding && (
            <div className="px-5 py-3 flex items-center gap-2 border-t border-slate-100">
              <Select value={selectedTech} onValueChange={setSelectedTech}>
                <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Select technician..." /></SelectTrigger>
                <SelectContent>
                  {availableTechs.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addTech} disabled={!selectedTech} className="bg-blue-600 hover:bg-blue-700 h-8">Add</Button>
              <Button size="sm" variant="outline" onClick={() => { setAdding(false); setSelectedTech(""); }} className="h-8">Cancel</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}