import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Plus, Clock, User, ChevronDown, ChevronUp, Sparkles, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function WorkLogSection({ job, techs = [] }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    technician_name: "",
    date: new Date().toISOString().split("T")[0],
    clock_in_time: "",
    clock_out_time: "",
    work_performed: "",
    issues_found: "",
    follow_up_needed: false,
    follow_up_notes: "",
    customer_satisfied: true,
    materials: [{ name: "", quantity: 1, unit: "", cost: "" }],
  });

  useEffect(() => {
    if (job?.id) loadLogs();
  }, [job?.id]);

  async function loadLogs() {
    setLoading(true);
    const data = await base44.entities.WorkLog.filter({ job_id: job.id }, "-created_date").catch(() => []);
    setLogs(data);
    setLoading(false);
  }

  const resetForm = () => setForm({ technician_name: "", date: new Date().toISOString().split("T")[0], clock_in_time: "", clock_out_time: "", work_performed: "", issues_found: "", follow_up_needed: false, follow_up_notes: "", customer_satisfied: true, materials: [{ name: "", quantity: 1, unit: "", cost: "" }] });

  async function handleSubmit(withAI = false) {
    if (!form.work_performed.trim()) return;
    setSaving(withAI ? "ai" : "manual");

    try {
      const user = await base44.auth.me().catch(() => null);

      let duration_minutes = null;
      let clock_in = null;
      let clock_out = null;
      if (form.clock_in_time && form.clock_out_time) {
        clock_in = `${form.date}T${form.clock_in_time}`;
        clock_out = `${form.date}T${form.clock_out_time}`;
        const diff = (new Date(clock_out) - new Date(clock_in)) / 60000;
        if (diff > 0) duration_minutes = Math.round(diff);
      }

      const materials_used = form.materials
        .filter(m => m.name.trim())
        .map(m => ({ name: m.name, quantity: Number(m.quantity) || 1, unit: m.unit, cost: m.cost ? Number(m.cost) : undefined }));

      let ai_summary = "";
      if (withAI) {
        try {
          ai_summary = await base44.integrations.Core.InvokeLLM({
            prompt: `Summarize this field tech work log in 2-3 sentences for office staff:\n\nWork performed: ${form.work_performed}\nIssues: ${form.issues_found || "None"}\nMaterials: ${materials_used.map(m => `${m.quantity} ${m.unit || ""} ${m.name}`).join(", ") || "None"}\nFollow-up needed: ${form.follow_up_needed ? "Yes - " + form.follow_up_notes : "No"}\nCustomer satisfied: ${form.customer_satisfied ? "Yes" : "No/Unknown"}`,
          });
        } catch (_) {}
      }

      await base44.entities.WorkLog.create({
        company_id: job.company_id,
        job_id: job.id,
        technician_id: user?.id,
        technician_name: form.technician_name || user?.full_name || "Staff",
        date: form.date,
        clock_in,
        clock_out,
        duration_minutes,
        work_performed: form.work_performed,
        issues_found: form.issues_found || undefined,
        follow_up_needed: form.follow_up_needed,
        follow_up_notes: form.follow_up_notes || undefined,
        customer_satisfied: form.customer_satisfied,
        materials_used,
        ai_summary,
        status: "submitted",
      });

      setShowForm(false);
      resetForm();
      await loadLogs();
    } catch (err) {
      console.error("WorkLog save failed:", err);
      alert("Failed to save work log. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function updateMaterial(i, field, value) {
    setForm(f => {
      const mats = [...f.materials];
      mats[i] = { ...mats[i], [field]: value };
      return { ...f, materials: mats };
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-slate-800">Work Logs</h3>
          {logs.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{logs.length}</span>}
        </div>
        <div className="flex gap-2">
          <Link to="/FieldTechAgent" className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3" /> AI Log
          </Link>
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3 h-3" /> Add Log
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Technician Name</Label>
              <Input value={form.technician_name} onChange={e => setForm(f => ({ ...f, technician_name: e.target.value }))} placeholder="Your name" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Clock In</Label>
              <Input type="time" value={form.clock_in_time} onChange={e => setForm(f => ({ ...f, clock_in_time: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Clock Out</Label>
              <Input type="time" value={form.clock_out_time} onChange={e => setForm(f => ({ ...f, clock_out_time: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Work Performed *</Label>
            <Textarea value={form.work_performed} onChange={e => setForm(f => ({ ...f, work_performed: e.target.value }))} rows={3} placeholder="Describe everything you did..." className="text-sm" />
          </div>

          {/* Materials */}
          <div>
            <Label className="text-xs">Materials Used</Label>
            {form.materials.map((m, i) => (
              <div key={i} className="flex gap-1.5 mt-1 items-center">
                <Input placeholder="Item name" value={m.name} onChange={e => updateMaterial(i, "name", e.target.value)} className="flex-1 h-7 text-xs" />
                <Input placeholder="Qty" type="number" value={m.quantity} onChange={e => updateMaterial(i, "quantity", e.target.value)} className="w-14 h-7 text-xs" />
                <Input placeholder="Unit" value={m.unit} onChange={e => updateMaterial(i, "unit", e.target.value)} className="w-16 h-7 text-xs" />
                <button onClick={() => setForm(f => ({ ...f, materials: f.materials.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, materials: [...f.materials, { name: "", quantity: 1, unit: "", cost: "" }] }))} className="text-xs text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add material
            </button>
          </div>

          <div>
            <Label className="text-xs">Issues Found</Label>
            <Textarea value={form.issues_found} onChange={e => setForm(f => ({ ...f, issues_found: e.target.value }))} rows={2} placeholder="Any problems discovered..." className="text-sm" />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.follow_up_needed} onChange={e => setForm(f => ({ ...f, follow_up_needed: e.target.checked }))} className="rounded" />
              <span className="text-sm text-slate-700">Follow-up needed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.customer_satisfied} onChange={e => setForm(f => ({ ...f, customer_satisfied: e.target.checked }))} className="rounded" />
              <span className="text-sm text-slate-700">Customer satisfied</span>
            </label>
          </div>

          {form.follow_up_needed && (
            <div>
              <Label className="text-xs">Follow-up Notes</Label>
              <Textarea value={form.follow_up_notes} onChange={e => setForm(f => ({ ...f, follow_up_notes: e.target.value }))} rows={2} className="text-sm" placeholder="What needs to be done..." />
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => handleSubmit(false)} disabled={!!saving || !form.work_performed.trim()} className="bg-blue-600 hover:bg-blue-700">
              {saving === "manual" ? "Saving..." : "Save Log"}
            </Button>
            <Button size="sm" onClick={() => handleSubmit(true)} disabled={!!saving || !form.work_performed.trim()} variant="outline" className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50">
              {saving === "ai" ? "Generating..." : <><Sparkles className="w-3.5 h-3.5" /> Save with AI Summary</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Existing logs */}
      {!loading && logs.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {logs.map(log => (
            <div key={log.id} className="px-5 py-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800">{log.technician_name}</span>
                  <span className="text-xs text-slate-400">{log.date ? format(new Date(log.date), "MMM d, yyyy") : ""}</span>
                  {log.duration_minutes && <span className="text-xs text-slate-400 flex items-center gap-0.5"><Clock className="w-3 h-3" />{Math.floor(log.duration_minutes/60)}h{log.duration_minutes%60 > 0 ? ` ${log.duration_minutes%60}m` : ""}</span>}
                  {log.follow_up_needed && <Badge className="text-xs bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3 inline mr-0.5" />Follow-up</Badge>}
                </div>
                {expanded === log.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
              {log.ai_summary && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  <Sparkles className="w-3 h-3 inline mr-0.5 text-blue-400" />{log.ai_summary}
                </p>
              )}
              {expanded === log.id && (
                <div className="mt-3 space-y-2 text-sm">
                  {log.work_performed && <p className="text-slate-700"><span className="font-medium text-slate-500 text-xs uppercase block mb-0.5">Work Done</span>{log.work_performed}</p>}
                  {log.materials_used?.length > 0 && (
                    <div>
                      <span className="font-medium text-slate-500 text-xs uppercase block mb-0.5">Materials</span>
                      {log.materials_used.map((m, i) => <span key={i} className="inline-block mr-2 text-slate-700">{m.quantity} {m.unit} {m.name}</span>)}
                    </div>
                  )}
                  {log.issues_found && <p className="text-amber-700 bg-amber-50 rounded p-2"><span className="font-medium">Issues: </span>{log.issues_found}</p>}
                  {log.follow_up_notes && <p className="text-slate-600"><span className="font-medium">Follow-up: </span>{log.follow_up_notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && logs.length === 0 && !showForm && (
        <div className="border-t border-slate-100 px-5 py-6 text-center text-slate-400 text-sm">
          No work logs yet. Add one above or use the AI voice logger.
        </div>
      )}
    </div>
  );
}