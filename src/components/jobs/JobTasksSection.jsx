import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Check, Trash2, Lock, AlertCircle, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 border-red-200" },
  high:   { label: "High",   className: "bg-orange-100 text-orange-700 border-orange-200" },
  normal: { label: "Normal", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function JobTasksSection({ job, techs = [], onTasksUpdated }) {
  const [tasks, setTasks] = useState(job?.checklist || []);
  const [newText, setNewText] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function persist(updated) {
    setTasks(updated);
    setSaving(true);
    await base44.entities.Job.update(job.id, { checklist: updated });
    setSaving(false);
    onTasksUpdated?.(updated);
  }

  async function addTask(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    const task = {
      id: `t_${Date.now()}`,
      item: newText.trim(),
      completed: false,
      assignee: newAssignee,
      due_date: newDue,
      priority: newPriority,
      created_at: new Date().toISOString(),
    };
    const updated = [...tasks, task];
    await persist(updated);
    setNewText("");
    setNewAssignee("");
    setNewDue("");
    setNewPriority("normal");
    setShowForm(false);
  }

  async function toggleTask(id) {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    await persist(updated);
  }

  async function deleteTask(id) {
    const updated = tasks.filter(t => t.id !== id);
    await persist(updated);
  }

  const open = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);
  const progress = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;

  function TaskRow({ task }) {
    const isOverdue = task.due_date && !task.completed && new Date(task.due_date) < new Date();
    const techName = techs.find(t => t.id === task.assignee)
      ? `${techs.find(t => t.id === task.assignee).first_name} ${techs.find(t => t.id === task.assignee).last_name}`
      : task.assignee || null;

    return (
      <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${task.completed ? "bg-slate-50 opacity-60 border-slate-100" : "bg-white border-slate-200 hover:border-slate-300"}`}>
        <button
          onClick={() => toggleTask(task.id)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            task.completed ? "bg-green-500 border-green-500" : "border-slate-300 hover:border-blue-400"
          }`}
        >
          {task.completed && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${task.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
            {task.item}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {task.priority && task.priority !== "normal" && (
              <Badge className={`text-xs border px-1.5 py-0 ${PRIORITY_CONFIG[task.priority]?.className}`}>
                {PRIORITY_CONFIG[task.priority]?.label}
              </Badge>
            )}
            {techName && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <User className="w-3 h-3" /> {techName}
              </span>
            )}
            {task.due_date && (
              <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {format(new Date(task.due_date), "MMM d")}
                {isOverdue && " — OVERDUE"}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-400 flex-shrink-0 mt-0.5">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">Internal Task Board</h3>
            <span className="text-xs text-slate-400 bg-amber-50 border border-amber-200 text-amber-600 px-1.5 py-0.5 rounded font-medium">Staff only</span>
          </div>
          {tasks.length > 0 && (
            <span className="text-xs text-slate-500">{done.length}/{tasks.length} done</span>
          )}
        </div>
        {tasks.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">{progress}%</span>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs h-7 px-2"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-3 h-3" /> Add Task
        </Button>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <form onSubmit={addTask} className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
          <Input
            autoFocus
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Task description..."
            className="text-sm h-8"
          />
          <div className="flex gap-2 flex-wrap">
            <select
              value={newAssignee}
              onChange={e => setNewAssignee(e.target.value)}
              className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white text-slate-600 flex-1 min-w-28"
            >
              <option value="">No assignee</option>
              {techs.map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
            <input
              type="date"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
              className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white text-slate-600"
            />
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white text-slate-600"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 gap-1">
              <Plus className="w-3 h-3" /> Add
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="p-4 space-y-2">
        {tasks.length === 0 && !showForm && (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400 mb-2">No tasks yet</p>
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowForm(true)}>
              <Plus className="w-3 h-3" /> Add first task
            </Button>
          </div>
        )}

        {/* Open tasks */}
        {open.map(task => <TaskRow key={task.id} task={task} />)}

        {/* Completed tasks (collapsed group) */}
        {done.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 py-1 select-none">
              {done.length} completed {done.length === 1 ? "task" : "tasks"}
            </summary>
            <div className="space-y-2 mt-2">
              {done.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          </details>
        )}

        {saving && <p className="text-xs text-slate-400 text-right">Saving...</p>}
      </div>
    </div>
  );
}