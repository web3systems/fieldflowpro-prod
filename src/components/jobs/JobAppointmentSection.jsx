import { useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Plus, Save, Trash2, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const APPOINTMENT_STATUS_COLORS = {
  upcoming: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const emptyAppointment = () => ({
  id: `apt_${Date.now()}`,
  scheduled_start: "",
  scheduled_end: "",
  status: "upcoming",
  notes: "",
  assigned_techs: [],
});

export default function JobAppointmentSection({ form, setForm, techs, onSave, saving }) {
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const appointments = form.appointments || [];

  // If no appointments exist yet, seed from legacy scheduled_start/scheduled_end
  const hasLegacy = form.scheduled_start && appointments.length === 0;

  function seedFromLegacy() {
    const seeded = [{
      ...emptyAppointment(),
      scheduled_start: form.scheduled_start || "",
      scheduled_end: form.scheduled_end || "",
      status: "upcoming",
    }];
    setForm(f => ({ ...f, appointments: seeded }));
  }

  function addAppointment() {
    const updated = [...appointments, emptyAppointment()];
    setForm(f => ({ ...f, appointments: updated }));
    setEditingId(updated[updated.length - 1].id);
  }

  function updateAppointment(id, field, value) {
    const updated = appointments.map(a => a.id === id ? { ...a, [field]: value } : a);
    setForm(f => ({ ...f, appointments: updated }));
  }

  function removeAppointment(id) {
    const updated = appointments.filter(a => a.id !== id);
    setForm(f => ({ ...f, appointments: updated }));
    if (editingId === id) setEditingId(null);
  }

  function toggleTech(id, techId) {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    const current = apt.assigned_techs || [];
    const updated = current.includes(techId)
      ? current.filter(t => t !== techId)
      : [...current, techId];
    updateAppointment(id, "assigned_techs", updated);
  }

  async function saveAppointment(id) {
    await onSave();
    setEditingId(null);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800">Appointments</h3>
          <Badge className="text-xs bg-slate-100 text-slate-600">{appointments.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={e => { e.stopPropagation(); addAppointment(); setExpanded(true); }}
          >
            <Plus className="w-3 h-3" /> Add Visit
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          {/* Legacy migration prompt */}
          {hasLegacy && (
            <div className="pt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
              <p className="text-sm text-blue-800 mb-2">This job has a legacy appointment scheduled for {format(new Date(form.scheduled_start), "MMM d, h:mm a")}.</p>
              <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700" onClick={(e) => { e.stopPropagation(); seedFromLegacy(); }}>
                Convert to Appointment
              </Button>
            </div>
          )}

          {appointments.length === 0 && !hasLegacy ? (
            <p className="text-sm text-slate-400 italic py-4 text-center">No appointments scheduled yet. Add a visit to get started.</p>
          ) : (
            <div className="space-y-3 pt-4">
              {appointments
                .sort((a, b) => new Date(a.scheduled_start || 0) - new Date(b.scheduled_start || 0))
                .map((apt) => {
                  const isEditing = editingId === apt.id;
                  const aptTechs = (apt.assigned_techs || []).map(tid => techs.find(t => t.id === tid)).filter(Boolean);

                  return (
                    <div key={apt.id} className={`border rounded-lg p-3 ${isEditing ? "border-blue-300 bg-blue-50/30" : "border-slate-200"}`}>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-slate-500">Start</Label>
                              <Input
                                type="datetime-local"
                                value={apt.scheduled_start || ""}
                                onChange={e => updateAppointment(apt.id, "scheduled_start", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-500">End</Label>
                              <Input
                                type="datetime-local"
                                value={apt.scheduled_end || ""}
                                onChange={e => updateAppointment(apt.id, "scheduled_end", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">Status</Label>
                            <Select value={apt.status || "upcoming"} onValueChange={v => updateAppointment(apt.id, "status", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="upcoming">Upcoming</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {techs.length > 0 && (
                            <div>
                              <Label className="text-xs text-slate-500 mb-1 block">Assigned Techs (this visit)</Label>
                              <div className="flex flex-wrap gap-1.5">
                                {techs.map(t => {
                                  const selected = (apt.assigned_techs || []).includes(t.id);
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => toggleTech(apt.id, t.id)}
                                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                        selected
                                          ? "bg-blue-100 text-blue-700 border-blue-300"
                                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                      }`}
                                    >
                                      {t.first_name} {t.last_name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div>
                            <Label className="text-xs text-slate-500">Notes</Label>
                            <Textarea
                              value={apt.notes || ""}
                              onChange={e => updateAppointment(apt.id, "notes", e.target.value)}
                              rows={2}
                              placeholder="Visit-specific notes..."
                              className="text-sm resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveAppointment(apt.id)} disabled={saving} className="gap-1 bg-blue-600 hover:bg-blue-700">
                              <Save className="w-3 h-3" />{saving ? "Saving..." : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 ml-auto" onClick={() => removeAppointment(apt.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`text-xs ${APPOINTMENT_STATUS_COLORS[apt.status] || "bg-blue-100 text-blue-700"}`}>
                                {apt.status?.replace("_", " ")}
                              </Badge>
                            </div>
                            {apt.scheduled_start ? (
                              <>
                                <p className="text-sm font-medium text-slate-800">
                                  {format(new Date(apt.scheduled_start), "EEE, MMM d · h:mm a")}
                                </p>
                                {apt.scheduled_end && (
                                  <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> until {format(new Date(apt.scheduled_end), "h:mm a")}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-slate-400 italic">No date set</p>
                            )}
                            {apt.notes && <p className="text-xs text-slate-500 mt-1">{apt.notes}</p>}
                            {aptTechs.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {aptTechs.map(t => (
                                  <span key={t.id} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {t.first_name} {t.last_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-blue-600 h-7 text-xs" onClick={(e) => { e.stopPropagation(); setEditingId(apt.id); setExpanded(true); }}>
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}