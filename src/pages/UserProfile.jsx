import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Mail, Phone, Calendar, Briefcase,
  Building2, AlertCircle, Save, Pencil, Lock, KeyRound, CheckCircle
} from "lucide-react";

const ROLE_LABELS = {
  standard: { label: "Standard", color: "bg-slate-100 text-slate-700" },
  manager: { label: "Manager", color: "bg-blue-100 text-blue-700" },
  admin: { label: "Admin", color: "bg-purple-100 text-purple-700" },
  super_admin: { label: "Super Admin", color: "bg-red-100 text-red-700" },
};

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { companies } = useApp();
  const [profileUser, setProfileUser] = useState(null);
  const [accessRecords, setAccessRecords] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [resetStatus, setResetStatus] = useState(null); // null | 'sending' | 'sent' | 'error'

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    setLoading(true);
    const [allUsers, allAccess, allTechs, me] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.UserCompanyAccess.list(),
      base44.entities.Technician.list(),
      base44.auth.me(),
    ]);
    setCurrentUser(me);
    const found = allUsers.find(u => u.id === id);
    setProfileUser(found || null);
    setAccessRecords(allAccess.filter(a => a.user_email === found?.email));
    setTechnicians(allTechs.filter(t => t.email === found?.email));
    if (found) setForm(buildForm(found));
    setLoading(false);
  }

  function buildForm(u) {
    return {
      job_title: u.job_title || "",
      department: u.department || "",
      phone: u.phone || "",
      bio: u.bio || "",
      address: u.address || "",
      city: u.city || "",
      state: u.state || "",
      zip: u.zip || "",
      emergency_contact_name: u.emergency_contact_name || "",
      emergency_contact_phone: u.emergency_contact_phone || "",
      start_date: u.start_date || "",
      is_active: u.is_active !== false,
    };
  }

  async function handleSendPasswordReset() {
    setResetStatus('sending');
    try {
      await base44.integrations.Core.SendEmail({
        to: profileUser.email,
        subject: "Password Reset Request",
        body: `Hi ${profileUser.full_name || profileUser.email},\n\nAn administrator has requested a password reset for your account.\n\nPlease visit the app login page and use the "Forgot Password" option to set a new password for your account (${profileUser.email}).\n\nIf you did not request this, please contact your administrator.\n\nThank you`
      });
      setResetStatus('sent');
      setTimeout(() => setResetStatus(null), 4000);
    } catch {
      setResetStatus('error');
      setTimeout(() => setResetStatus(null), 4000);
    }
  }

  async function handleSave() {
    setSaving(true);
    await base44.entities.User.update(id, form);
    setSaving(false);
    setEditing(false);
    await loadData();
  }

  function getUserCompanies() {
    const ids = accessRecords.map(a => a.company_id);
    return companies.filter(c => ids.includes(c.id));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (!profileUser) return (
    <div className="p-6 text-center text-slate-500">User not found.</div>
  );

  const roleInfo = ROLE_LABELS[profileUser.role] || ROLE_LABELS.standard;
  const userCompanies = getUserCompanies();
  const initials = profileUser.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || profileUser.email?.[0]?.toUpperCase();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold text-slate-900">User Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Identity */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl mx-auto mb-4">
                {profileUser.avatar_url
                  ? <img src={profileUser.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  : initials}
              </div>
              <h2 className="text-lg font-bold text-slate-900">{profileUser.full_name || "—"}</h2>
              <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mt-1">
                <Mail className="w-3 h-3" />{profileUser.email}
              </p>
              {form.job_title && <p className="text-sm text-slate-600 mt-1">{form.job_title}{form.department ? ` · ${form.department}` : ""}</p>}
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleInfo.color}`}>{roleInfo.label}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${form.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {form.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Companies */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Company Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {userCompanies.length === 0
                ? <p className="text-sm text-slate-400">No company access assigned</p>
                : userCompanies.map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: c.primary_color || "#3b82f6" }}>
                      {c.name[0]}
                    </div>
                    <span className="text-sm text-slate-700">{c.name}</span>
                    {technicians.find(t => t.company_id === c.id) && (
                      <Badge variant="secondary" className="text-xs ml-auto">Team</Badge>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Joined</span>
                <span>{profileUser.created_date ? new Date(profileUser.created_date).toLocaleDateString() : "—"}</span>
              </div>
              {form.start_date && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Start Date</span>
                  <span>{new Date(form.start_date).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Profile Details</h3>
            {!editing
              ? <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2"><Pencil className="w-3 h-3" />Edit</Button>
              : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(buildForm(profileUser)); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Save className="w-3 h-3" />{saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
          </div>

          {/* Work Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Briefcase className="w-4 h-4" /> Work Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Job Title</Label>
                      <Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Department</Label>
                      <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Account Status</Label>
                    <Select value={form.is_active ? "active" : "inactive"} onValueChange={v => setForm(f => ({ ...f, is_active: v === "active" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Bio / Notes</Label>
                    <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div><p className="text-slate-400">Job Title</p><p className="font-medium text-slate-800">{form.job_title || "—"}</p></div>
                  <div><p className="text-slate-400">Department</p><p className="font-medium text-slate-800">{form.department || "—"}</p></div>
                  <div><p className="text-slate-400">Start Date</p><p className="font-medium text-slate-800">{form.start_date ? new Date(form.start_date).toLocaleDateString() : "—"}</p></div>
                  <div><p className="text-slate-400">Status</p><p className={`font-medium ${form.is_active ? "text-green-700" : "text-red-600"}`}>{form.is_active ? "Active" : "Inactive"}</p></div>
                  {form.bio && <div className="col-span-2"><p className="text-slate-400">Bio</p><p className="text-slate-700">{form.bio}</p></div>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4" /> Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>City</Label>
                      <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>State</Label>
                      <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>ZIP</Label>
                      <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div><p className="text-slate-400">Phone</p><p className="font-medium text-slate-800">{form.phone || "—"}</p></div>
                  <div className="col-span-2">
                    <p className="text-slate-400">Address</p>
                    <p className="font-medium text-slate-800">
                      {[form.address, form.city, form.state, form.zip].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input type="tel" value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div><p className="text-slate-400">Name</p><p className="font-medium text-slate-800">{form.emergency_contact_name || "—"}</p></div>
                  <div><p className="text-slate-400">Phone</p><p className="font-medium text-slate-800">{form.emergency_contact_phone || "—"}</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}