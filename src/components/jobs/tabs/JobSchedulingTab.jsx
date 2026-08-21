import { Calendar, Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JobAppointmentSection from "@/components/jobs/JobAppointmentSection";
import JobFieldTechSection from "@/components/jobs/JobFieldTechSection";

function toLocalInput(iso) {
  if (!iso) return "";
  return String(iso).slice(0, 16);
}

export default function JobSchedulingTab({ ctx }) {
  const { form, setForm, techs, onSave, saving } = ctx;

  return (
    <div className="space-y-4">
      {/* Job-level dates */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500" /> Job Dates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Scheduled Start</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(form.scheduled_start)}
              onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Scheduled End</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(form.scheduled_end)}
              onChange={e => setForm(f => ({ ...f, scheduled_end: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Actual Start</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(form.actual_start)}
              onChange={e => setForm(f => ({ ...f, actual_start: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Actual End</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(form.actual_end)}
              onChange={e => setForm(f => ({ ...f, actual_end: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Appointments (per-visit scheduling) */}
      <JobAppointmentSection form={form} setForm={setForm} techs={techs} onSave={onSave} saving={saving} />

      {/* Assigned techs (job-level) */}
      <JobFieldTechSection form={form} setForm={setForm} techs={techs} onSave={onSave} />

      {/* Recurring job settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Repeat className="w-4 h-4 text-slate-500" /> Recurring Job</h3>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_recurring || false} onCheckedChange={v => setForm(f => ({ ...f, is_recurring: v }))} id="is_recurring" />
          <Label htmlFor="is_recurring" className="text-sm cursor-pointer">This is a recurring job</Label>
        </div>
        {form.is_recurring && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Repeat Interval</Label>
              <Select value={form.recurrence_interval || "monthly"} onValueChange={v => setForm(f => ({ ...f, recurrence_interval: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Recurrence Parent</Label>
              <Input
                value={form.recurrence_parent_id || ""}
                readOnly
                className="h-9 text-sm bg-slate-50"
                placeholder="None (this is the parent)"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}