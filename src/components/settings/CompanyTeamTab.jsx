import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useApp } from '@/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Plus, Wrench, Phone, Mail, Trash2, Pencil, RefreshCw, Eye, EyeOff, Building2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

const ROLE_OPTIONS = [
  { value: 'standard', label: 'Standard Employee', desc: 'Can use all non-admin features' },
  { value: 'manager', label: 'Manager', desc: 'Full access including settings' },
  { value: 'owner', label: 'Owner', desc: 'Full access + billing' },
];

const ROLE_LABELS = {
  owner: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  dispatcher: 'bg-teal-100 text-teal-700',
  standard: 'bg-slate-100 text-slate-700',
  technician: 'bg-green-100 text-green-700',
};

const TECH_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"
];

const defaultForm = {
  first_name: "", last_name: "", email: "", phone: "",
  status: "active", color: "#3b82f6", skills: [],
  password: "", assignments: [] // [{company_id, company_name, role: 'standard'}]
};

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pwd = "";
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export default function CompanyTeamTab({ company }) {
  const { companies, user } = useApp();
  const [techs, setTechs] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null);
  const [error, setError] = useState(null);

  const isManager = user?.role === 'admin' || user?.role === 'super_admin';

  // Get all companies this manager can assign to (parent + subsidiaries)
  const manageableCompanies = isManager
    ? companies
    : companies.filter(c => c.id === company.id || c.parent_company_id === company.id);

  useEffect(() => {
    loadData();
  }, [company.id]);

  async function loadData() {
    setLoading(true);
    try {
      const companyIds = manageableCompanies.map(c => c.id);
      const [techList, accessList] = await Promise.all([
        Promise.all(companyIds.map(cid => base44.entities.Technician.filter({ company_id: cid }))).then(arr => arr.flat()),
        base44.entities.UserCompanyAccess.list(),
      ]);
      setTechs(techList);
      setAccessRecords(accessList);
    } catch (e) {
      console.error('loadData error:', e);
    }
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...defaultForm, assignments: [{ company_id: company.id, company_name: company.name, role: 'standard' }] });
    setSkillInput("");
    setShowPassword(false);
    setInviteStatus(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(tech) {
    setEditing(tech);
    setForm({
      first_name: tech.first_name || '',
      last_name: tech.last_name || '',
      email: tech.email || '',
      phone: tech.phone || '',
      status: tech.status || 'active',
      color: tech.color || '#3b82f6',
      skills: tech.skills || [],
      password: '',
      assignments: [],
    });
    setSkillInput("");
    setShowPassword(false);
    setInviteStatus(null);
    setError(null);
    setDialogOpen(true);
  }

  function toggleAssignment(comp) {
    setForm(f => {
      const exists = f.assignments.find(a => a.company_id === comp.id);
      if (exists) {
        return { ...f, assignments: f.assignments.filter(a => a.company_id !== comp.id) };
      }
      return { ...f, assignments: [...f.assignments, { company_id: comp.id, company_name: comp.name, role: 'standard' }] };
    });
  }

  function updateAssignmentRole(compId, role) {
    setForm(f => ({
      ...f,
      assignments: f.assignments.map(a => a.company_id === compId ? { ...a, role } : a),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setInviteStatus(null);
    setError(null);
    try {
      if (editing) {
        const data = {
          first_name: form.first_name, last_name: form.last_name,
          email: form.email, phone: form.phone,
          status: form.status, color: form.color, skills: form.skills,
        };
        await base44.entities.Technician.update(editing.id, data);
        setDialogOpen(false);
        await loadData();
      } else {
        if (!form.assignments.length) {
          setError('Select at least one company to assign this member to.');
          setSaving(false);
          return;
        }
        const res = await base44.functions.invoke('inviteTeamMember', {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password || null,
          assignments: form.assignments.map(a => ({ company_id: a.company_id, company_name: a.company_name, role: a.role })),
        });
        if (res.data?.success) {
          setInviteStatus({ type: 'success', message: `${form.first_name} invited successfully!` });
          setDialogOpen(false);
          await loadData();
        } else {
          setInviteStatus({ type: 'error', message: res.data?.error || 'Something went wrong.' });
        }
      }
    } catch (err) {
      setInviteStatus({ type: 'error', message: err.response?.data?.error || err.message || 'Failed.' });
    }
    setSaving(false);
  }

  async function handleResendInvite(tech) {
    try {
      const res = await base44.functions.invoke('inviteTeamMember', {
        first_name: tech.first_name,
        last_name: tech.last_name,
        email: tech.email,
        password: null,
        assignments: [{ company_id: company.id, company_name: company.name, role: 'standard' }],
      });
      if (res.data?.success) {
        alert(`Invite resent to ${tech.email}`);
      } else {
        alert(res.data?.error || 'Failed to resend invite.');
      }
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleDelete() {
    await base44.entities.Technician.delete(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  }

  async function handleUpdateRole(userEmail, newRole) {
    const recs = accessRecords.filter(a => a.user_email === userEmail);
    await Promise.all(recs.map(r => base44.entities.UserCompanyAccess.update(r.id, { role: newRole })));
    await loadData();
  }

  async function handleRemoveAccess(userEmail, compId) {
    const rec = accessRecords.find(a => a.user_email === userEmail && a.company_id === compId);
    if (rec) await base44.entities.UserCompanyAccess.delete(rec.id);
    const tech = techs.find(t => t.email === userEmail && t.company_id === compId);
    if (tech) await base44.entities.Technician.delete(tech.id);
    await loadData();
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

  function getUserCompanies(email) {
    const ids = accessRecords.filter(a => a.user_email === email).map(a => a.company_id);
    return manageableCompanies.filter(c => ids.includes(c.id));
  }

  function getUserRole(email) {
    return accessRecords.find(a => a.user_email === email)?.role || 'standard';
  }

  const statusStyle = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    on_leave: "bg-amber-100 text-amber-700"
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Team Members</h2>
            <p className="text-slate-500 text-sm">{techs.length} member{techs.length !== 1 ? 's' : ''} across {manageableCompanies.length} location{manageableCompanies.length !== 1 ? 's' : ''}</p>
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
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No team members yet</p>
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Add Member</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {techs.map(tech => {
              const userCompanies = getUserCompanies(tech.email);
              const userRole = getUserRole(tech.email);
              return (
                <Card key={tech.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: tech.color || "#3b82f6" }}
                        >
                          {tech.first_name?.[0]}{tech.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{tech.first_name} {tech.last_name}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <Badge className={`text-xs ${statusStyle[tech.status] || "bg-gray-100 text-gray-600"}`}>
                              {tech.status?.replace("_", " ")}
                            </Badge>
                            {userRole && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_LABELS[userRole] || ROLE_LABELS.standard}`}>
                                {userRole}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-blue-600" onClick={() => handleResendInvite(tech)} title="Resend invite">
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-700" onClick={() => openEdit(tech)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => setDeleteTarget(tech)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      {tech.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{tech.phone}</span>}
                      {tech.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{tech.email}</span>}
                    </div>
                    {tech.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tech.skills.map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                    {/* Role & Company Access */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide w-16">Role</p>
                        <Select value={userRole} onValueChange={v => handleUpdateRole(tech.email, v)}>
                          <SelectTrigger className="w-36 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map(r => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {manageableCompanies.length > 1 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Access</p>
                          <div className="flex flex-wrap gap-2">
                            {manageableCompanies.map(c => {
                              const hasAccess = userCompanies.some(uc => uc.id === c.id);
                              return (
                                <span key={c.id} className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer transition-colors ${
                                  hasAccess ? 'text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                                  style={hasAccess ? { backgroundColor: c.primary_color || '#6b7280' } : {}}
                                  onClick={() => {
                                    if (hasAccess) {
                                      handleRemoveAccess(tech.email, c.id);
                                    } else {
                                      // For existing users, add access + tech record
                                      base44.entities.UserCompanyAccess.create({
                                        user_email: tech.email,
                                        user_name: `${tech.first_name} ${tech.last_name}`,
                                        company_id: c.id,
                                        role: 'standard',
                                      }).then(() => {
                                        base44.entities.Technician.create({
                                          company_id: c.id,
                                          first_name: tech.first_name,
                                          last_name: tech.last_name,
                                          email: tech.email,
                                          status: 'active',
                                        });
                                      }).then(() => loadData());
                                    }
                                  }}
                                >
                                  {hasAccess ? '✓ ' : '+ '}{c.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
              {!editing && <p className="text-sm text-slate-500">Invite a new team member and assign them to companies.</p>}
            </DialogHeader>
            <div className="space-y-4 py-2">
              {inviteStatus && (
                <div className={`text-sm rounded-lg p-3 ${inviteStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {inviteStatus.message}
                </div>
              )}
              {error && (
                <div className="text-sm rounded-lg p-3 bg-red-50 text-red-700 border border-red-200">{error}</div>
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
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {!editing && (
                <>
                  {/* Company Assignments */}
                  <div>
                    <Label>Assign to Companies *</Label>
                    <p className="text-xs text-slate-400 mb-2">Select companies and set their role for each.</p>
                    <div className="space-y-2">
                      {manageableCompanies.map(c => {
                        const assignment = form.assignments.find(a => a.company_id === c.id);
                        return (
                          <div key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border ${assignment ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200'}`}>
                            <Checkbox
                              checked={!!assignment}
                              onCheckedChange={() => toggleAssignment(c)}
                            />
                            <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: c.primary_color || '#3b82f6' }}>
                              {c.name[0]}
                            </div>
                            <span className="text-sm flex-1">{c.name}</span>
                            {assignment && (
                              <Select value={assignment.role} onValueChange={v => updateAssignmentRole(c.id, v)}>
                                <SelectTrigger className="w-32 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Password */}
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
                </>
              )}

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
              <Button
                onClick={handleSave}
                disabled={saving || !form.first_name || !form.last_name || (!editing && !form.email)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Invite Member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {deleteTarget?.first_name} {deleteTarget?.last_name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove them from the team. Their user account and company access remain unaffected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}