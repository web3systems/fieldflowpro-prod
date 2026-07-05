import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { UserPlus, Trash2, Mail, Building2, Users as UsersIcon, Search, ShieldCheck, User, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const PLATFORM_ROLES = {
  admin: { label: "Platform Admin", color: "bg-orange-100 text-orange-700" },
  manager: { label: "Manager", color: "bg-blue-100 text-blue-700" },
  user: { label: "User", color: "bg-slate-100 text-slate-700" },
};

export default function SaaSUsers() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [inviteSheet, setInviteSheet] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "user" });
  const [inviting, setInviting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [allUsers, allCompanies, allAccess] = await Promise.all([
      base44.entities.User.list("-created_date", 500),
      base44.entities.Company.list("name", 500),
      base44.entities.UserCompanyAccess.list("-created_date", 1000),
    ]);
    setUsers(allUsers);
    setCompanies(allCompanies);
    setAccessRecords(allAccess);
    setLoading(false);
  }

  function getCompaniesForUser(email) {
    const ids = new Set(accessRecords.filter(a => a.user_email === email).map(a => a.company_id));
    return companies.filter(c => ids.has(c.id));
  }

  function getRoleForAccess(email) {
    return accessRecords.find(a => a.user_email === email)?.role || "—";
  }

  async function handleDelete(user) {
    const recs = accessRecords.filter(a => a.user_email === user.email);
    await Promise.all([
      ...recs.map(r => base44.entities.UserCompanyAccess.delete(r.id)),
      base44.entities.User.delete(user.id),
    ]);
    setDeleteTarget(null);
    await loadData();
  }

  async function handleInvite() {
    if (!inviteForm.email) return;
    setInviting(true);
    await base44.users.inviteUser(inviteForm.email, inviteForm.role);
    setInviting(false);
    setInviteSheet(false);
    setInviteForm({ email: "", role: "user" });
    await loadData();
  }

  const filtered = users.filter(u =>
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const platformAdmins = filtered.filter(u => u.role === "admin" || u.role === "super_admin");
  const regularUsers = filtered.filter(u => u.role !== "admin" && u.role !== "super_admin");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-orange-500" />
            Platform Users
          </h1>
          <p className="text-slate-500 text-sm mt-1">All registered users across the platform — {users.length} total</p>
        </div>
        <Button onClick={() => setInviteSheet(true)} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
          <UserPlus className="w-4 h-4" /> Invite User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No users found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Platform Admins */}
          {platformAdmins.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" /> Platform Admins ({platformAdmins.length})
              </p>
              <div className="space-y-2">
                {platformAdmins.map(u => <UserRow key={u.id} user={u} companies={getCompaniesForUser(u.email)} accessRole={getRoleForAccess(u.email)} expanded={expandedUser === u.id} onToggle={() => setExpandedUser(expandedUser === u.id ? null : u.id)} onDelete={() => setDeleteTarget(u)} />)}
              </div>
            </div>
          )}

          {/* Regular Users */}
          {regularUsers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Users ({regularUsers.length})
              </p>
              <div className="space-y-2">
                {regularUsers.map(u => <UserRow key={u.id} user={u} companies={getCompaniesForUser(u.email)} accessRole={getRoleForAccess(u.email)} expanded={expandedUser === u.id} onToggle={() => setExpandedUser(expandedUser === u.id ? null : u.id)} onDelete={() => setDeleteTarget(u)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Sheet */}
      <Sheet open={inviteSheet} onOpenChange={setInviteSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite Platform User</SheetTitle>
            <SheetDescription>Send an invitation email to a new user.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Platform Role</Label>
              <Select value={inviteForm.role} onValueChange={val => setInviteForm(f => ({ ...f, role: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User — standard tenant access</SelectItem>
                  <SelectItem value="admin">Admin — platform admin access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-400">The user will receive an invitation email with a link to set their password and access the platform.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setInviteSheet(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleInvite} disabled={inviting || !inviteForm.email} className="flex-1 bg-orange-500 hover:bg-orange-600">
                {inviting ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong> and revoke all their company access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteTarget)} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserRow({ user, companies, accessRole, expanded, onToggle, onDelete }) {
  const platformRole = PLATFORM_ROLES[user.role] || PLATFORM_ROLES.user;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={onToggle}>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
              {(user.full_name || user.email || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 truncate">{user.full_name || <span className="text-slate-400 italic">No name</span>}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{user.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${platformRole.color}`}>{platformRole.label}</span>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Building2 className="w-3 h-3" />{companies.length}
              </Badge>
              {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
          </button>
          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Joined</p>
                <p className="text-slate-700">{user.created_date ? format(new Date(user.created_date), "MMM d, yyyy") : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Company Role</p>
                <p className="text-slate-700 capitalize">{accessRole}</p>
              </div>
            </div>
            {companies.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">Company Access</p>
                <div className="flex flex-wrap gap-1.5">
                  {companies.map(c => (
                    <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.primary_color || "#3b82f6" }} />
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {companies.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">⚠️ This user has no company access assigned.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}