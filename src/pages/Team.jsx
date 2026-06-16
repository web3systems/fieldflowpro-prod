import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Plus, Wrench, Phone, Mail, Trash2, Pencil, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import UsageLimitBanner from "@/components/subscription/UsageLimitBanner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const TECH_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"
];

const defaultForm = {
  first_name: "", last_name: "", email: "", phone: "",
  status: "active", color: "#3b82f6", skills: [],
  role: "user", password: ""
};

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pwd = "";
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export default function Team() {
  const { activeCompany } = useApp();
  const [techs, setTechs] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null); // { type: 'success'|'error', message }

  useEffect(() => {
    if (activeCompany) {
      loadTechs();
      base44.entities.Subscription.filter({ company_id: activeCompany.id })
        .then(subs => setSubscription(subs[0] || null)).catch(() => {});
    }
  }, [activeCompany?.id]);

  async function loadTechs() {
    setLoading(true);
    const list = await base44.entities.Technician.filter({ company_id: activeCompany.id });
    setTechs(list);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setSkillInput("");
    setShowPassword(false);
    setInviteStatus(null);
    setDialogOpen(true);
  }

  function openEdit(tech) {
    setEditing(tech);
    setForm({ ...defaultForm, ...tech });
    setSkillInput("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setInviteStatus(null);
    try {
      if (editing) {
        // Editing existing — update Technician record only
        const data = { first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, status: form.status, color: form.color, skills: form.skills, company_id: activeCompany.id };
        await base44.entities.Technician.update(editing.id, data);
        setDialogOpen(false);
        await loadTechs();
      } else {
        // New member — invite via backend function
        const res = await base44.functions.invoke('inviteTeamMember', {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          role: form.role,
          password: form.password || null,
          company_id: activeCompany.id,
          company_name: activeCompany.name,
        });
        if (res.data?.success) {
          setInviteStatus({ type: 'success', message: `${form.first_name} has been invited! Check your email for credentials.` });
          setDialogOpen(false);
          await loadTechs();
        } else {
          setInviteStatus({ type: 'error', message: res.data?.error || 'Something went wrong.' });
        }
      }
    } catch (err) {
      setInviteStatus({ type: 'error', message: err.response?.data?.error || err.message || 'Failed to invite team member.' });
    }
    setSaving(false);
  }

  async function handleDelete() {
    await base44.entities.Technician.delete(deleteTarget.id);
    setDeleteTarget(null);
    await loadTechs();
  }

  function addSkill() {
    if (skillInput.trim() && !form.skills?.includes(skillInput.trim())) {
      setForm({ ...form, skills: [...(form.skills || []), skillInput.trim()] });
      setSkillInput("");
    }
  }

  function removeSkill(skill) {
    setForm({ ...form, skills: form.skills.filter(s => s !== skill) });
  }

  const statusStyle = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    on_leave: "bg-amber-100 text-amber-700"
  };

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-5 max-w-5xl mx-auto">
      <UsageLimitBanner subscription={subscription} metric="users" currentCount={techs.length} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 text-sm mt-0.5">{techs.length} team members</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Member
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : techs.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No team members yet</p>
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Add Member</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {techs.map(tech => (
            <Card key={tech.id} className="border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: tech.color || "#3b82f6" }}
                    >
                      {tech.first_name?.[0]}{tech.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{tech.first_name} {tech.last_name}</p>
                      <Badge className={`text-xs mt-0.5 ${statusStyle[tech.status] || "bg-gray-100 text-gray-600"}`}>
                        {tech.status?.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(tech)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(tech)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {tech.phone && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Phone className="w-3 h-3" />{tech.phone}</p>}
                  {tech.email && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Mail className="w-3 h-3" />{tech.email}</p>}
                </div>
                {tech.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tech.skills.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {inviteStatus && (
              <div className={`text-sm rounded-lg p-3 ${inviteStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {inviteStatus.message}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Email {!editing && "*"}</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              {!editing && (
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User (Technician)</SelectItem>
                      <SelectItem value="admin">Admin (Manager)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {!editing && (
              <div>
                <Label>Password</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter or generate a password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => { setForm({ ...form, password: generatePassword() }); setShowPassword(true); }}
                    title="Generate random password"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Leave blank to let them create their own password on first login.</p>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Calendar Color</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {TECH_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    className={`w-7 h-7 rounded-full transition-transform ${form.color === color ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : ""}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Skills</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSkill()}
                  placeholder="e.g. Plumbing, HVAC"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addSkill}>Add</Button>
              </div>
              {form.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.skills.map(s => (
                    <button
                      key={s}
                      onClick={() => removeSkill(s)}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors"
                    >
                      {s} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.first_name || !form.last_name || (!editing && !form.email)} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Saving..." : editing ? "Save Changes" : "Invite Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.first_name}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this team member.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}