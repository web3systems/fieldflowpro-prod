import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ClipboardList } from "lucide-react";

function genId() { return Math.random().toString(36).slice(2); }

export default function CustomerTasks({ customer, onUpdate }) {
  const tasks = customer.tasks || [];
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState("");

  async function addTask() {
    if (!newTask.trim()) return;
    const updated = [...tasks, { id: genId(), text: newTask.trim(), completed: false, created_at: new Date().toISOString() }];
    await onUpdate({ tasks: updated });
    setNewTask("");
    setAdding(false);
  }

  async function toggleTask(id) {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    await onUpdate({ tasks: updated });
  }

  async function deleteTask(id) {
    await onUpdate({ tasks: tasks.filter(t => t.id !== id) });
  }

  const open = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  return (
    <div className="bg-white rounded-xl shadow-sm border-0 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4 text-slate-500" /> Tasks
          {open.length > 0 && <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full font-medium">{open.length}</span>}
        </h3>
        <button onClick={() => setAdding(a => !a)} className="p-1 text-slate-400 hover:text-blue-600">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-3">
          <Input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Add a task..."
            className="text-sm h-8 flex-1"
            autoFocus
          />
          <Button size="sm" onClick={addTask} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 px-3">Add</Button>
          <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="h-8 text-xs px-3">×</Button>
        </div>
      )}

      {tasks.length === 0 && !adding ? (
        <p className="text-xs text-slate-400 text-center py-3">No tasks yet</p>
      ) : (
        <div className="space-y-1.5">
          {open.map(task => (
            <div key={task.id} className="flex items-center gap-2 group">
              <Checkbox checked={false} onCheckedChange={() => toggleTask(task.id)} className="flex-shrink-0" />
              <span className="text-sm text-slate-700 flex-1">{task.text}</span>
              <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {done.map(task => (
            <div key={task.id} className="flex items-center gap-2 group opacity-50">
              <Checkbox checked={true} onCheckedChange={() => toggleTask(task.id)} className="flex-shrink-0" />
              <span className="text-sm text-slate-500 line-through flex-1">{task.text}</span>
              <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}