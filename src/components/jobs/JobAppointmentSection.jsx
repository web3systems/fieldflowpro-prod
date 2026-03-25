import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, ChevronDown, ChevronUp, Plus, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  scheduled: "bg-purple-100 text-purple-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  on_hold: "bg-gray-100 text-gray-700",
};

export default function JobAppointmentSection({ form, setForm, onSave, saving }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800">Appointment</h3>
          {form.scheduled_start && (
            <Badge className={`text-xs ${STATUS_COLORS[form.status] || "bg-gray-100 text-gray-700"}`}>
              {form.status?.replace("_", " ")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); setEditing(true); setExpanded(true); }}>
              <Plus className="w-3 h-3" /> Edit Appointment
            </Button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          {editing ? (
            <div className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Start</Label>
                  <Input type="datetime-local" value={form.scheduled_start || ""} onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">End</Label>
                  <Input type="datetime-local" value={form.scheduled_end || ""} onChange={e => setForm(f => ({ ...f, scheduled_end: e.target.value }))} className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["new","scheduled","in_progress","completed","cancelled","on_hold"].map(s => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_recurring2" checked={form.is_recurring || false} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="rounded" />
                <Label htmlFor="is_recurring2" className="text-xs cursor-pointer">Recurring Job</Label>
              </div>
              {form.is_recurring && (
                <div>
                  <Label className="text-xs text-slate-500">Repeat Every</Label>
                  <Select value={form.recurrence_interval || "monthly"} onValueChange={v => setForm(f => ({ ...f, recurrence_interval: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => { await onSave(); setEditing(false); }} disabled={saving} className="gap-1 bg-blue-600 hover:bg-blue-700">
                  <Save className="w-3 h-3" />{saving ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="pt-4">
              {form.scheduled_start ? (
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{format(new Date(form.scheduled_start), "EEE, MMM d · h:mm a")}</p>
                    {form.scheduled_end && (
                      <p className="text-xs text-slate-400">until {format(new Date(form.scheduled_end), "h:mm a")}</p>
                    )}
                    {form.is_recurring && (
                      <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                        <RefreshCw className="w-3 h-3" /> Repeats {form.recurrence_interval}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic pt-2">No appointment scheduled yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}