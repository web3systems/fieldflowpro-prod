import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/lib/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Link2 } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "bg-slate-100 text-slate-700" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "on_hold", label: "On Hold", color: "bg-yellow-100 text-yellow-700" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-600" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-600" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-600" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700" },
];

const EMPTY_TASK = {
  title: "", description: "", status: "todo", priority: "medium",
  due_date: "", assigned_to_name: "", notes: "", ticket_id: ""
};

export default function Tasks() {
  const { activeCompany } = useApp();
  const [tasks, setTasks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeCompany?.id) return;
    loadData();
  }, [activeCompany?.id]);

  async function loadData() {
    setLoading(true);
    const [t, tk] = await Promise.all([
      base44.entities.Task.filter({ company_id: activeCompany.id }, "-created_date"),
      base44.entities.Ticket.filter({ company_id: activeCompany.id }, "-created_date").catch(() => []),
    ]);
    setTasks(t);
    setTickets(tk);
    setLoading(false);
  }

  function openNew() {
    setEditingTask(null);
    setForm({ ...EMPTY_TASK });
    setModalOpen(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setForm({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      due_date: task.due_date || "",
      assigned_to_name: task.assigned_to_name || "",
      notes: task.notes || "",
      ticket_id: task.ticket_id || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id };
    if (editingTask) {
      await base44.entities.Task.update(editingTask.id, data);
    } else {
      await base44.entities.Task.create(data);
    }
    setSaving(false);
    setModalOpen(false);
    loadData();
  }

  async function handleDelete(task) {
    if (!confirm("Delete this task?")) return;
    await base44.entities.Task.delete(task.id);
    loadData();
  }

  const getStatusStyle = (s) => STATUS_OPTIONS.find(o => o.value === s)?.color || "bg-slate-100 text-slate-700";
  const getStatusLabel = (s) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;
  const getPriorityStyle = (p) => PRIORITY_OPTIONS.find(o => o.value === p)?.color || "bg-slate-100 text-slate-600";
  const getPriorityLabel = (p) => PRIORITY_OPTIONS.find(o => o.value === p)?.label || p;
  const getTicketSubject = (id) => tickets.find(t => t.id === id)?.subject || "";

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search || t.title?.toLowerCase().includes(q) || t.assigned_to_name?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const grouped = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = filtered.filter(t => t.status === s.value);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage internal project tasks. Optionally link to a support ticket.</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Board */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          No tasks found. <button onClick={openNew} className="text-blue-600 hover:underline">Create one</button>.
        </div>
      ) : (
        <div className="space-y-8">
          {STATUS_OPTIONS.map(s => {
            const items = grouped[s.value];
            if (filterStatus !== "all" && filterStatus !== s.value) return null;
            if (items.length === 0) return null;
            return (
              <div key={s.value}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>
                  <span className="text-slate-400 text-xs">{items.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(task => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm leading-snug flex-1">{task.title}</h3>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEdit(task)} className="p-1 text-slate-400 hover:text-slate-700 rounded">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(task)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-slate-500 text-xs mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <Badge className={`text-xs ${getPriorityStyle(task.priority)}`}>{getPriorityLabel(task.priority)}</Badge>
                          {task.due_date && isValid(parseISO(task.due_date)) && (
                            <Badge variant="outline" className="text-xs">
                              Due {format(parseISO(task.due_date), "MMM d")}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                          {task.assigned_to_name ? (
                            <span>👤 {task.assigned_to_name}</span>
                          ) : <span />}
                          {task.ticket_id && getTicketSubject(task.ticket_id) && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <Link2 className="w-3 h-3" /> Ticket
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What needs to be done?" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <Label>Assigned To</Label>
                <Input value={form.assigned_to_name} onChange={e => setForm(f => ({ ...f, assigned_to_name: e.target.value }))} placeholder="Name" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." rows={2} />
            </div>
            {tickets.length > 0 && (
              <div>
                <Label>Link to Ticket (optional)</Label>
                <Select value={form.ticket_id || "none"} onValueChange={v => setForm(f => ({ ...f, ticket_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="No ticket linked" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No ticket</SelectItem>
                    {tickets.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}