import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Trash2, Mail, Building2, Users as UsersIcon, Search, ShieldCheck, User } from "lucide-react";

const ROLE_LABELS = {
  standard: { label: "Standard", desc: "Can use all non-admin features", color: "bg-slate-100 text-slate-700" },
  manager: { label: "Manager", desc: "Full access including admin features", color: "bg-blue-100 text-blue-700" },
};

export default function Users() {
  const { companies } = useApp();
  const [users, setUsers] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "standard", company_ids: [], add_to_team: false });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [allUsers, allAccess, allTechs] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.UserCompanyAccess.list(),
      base44.entities.Technician.list(),
    ]);
    // Filter out admin/super_admin
    setUsers(allUsers.filter(u => u.role !== "admin" && u.role !== "super_admin"));
    setAccessRecords(allAccess);
    setTechnicians(allTechs);
  }

  function getCompaniesForUser(userEmail) {
    const ids = accessRecords.filter(a => a.user_email === userEmail).map(a => a.company_id);
    return companies.filter(c => ids.includes(c.id));
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Invite the user if new
      setInviting(true);
      await base44.users.inviteUser(form.email, "user");
      setInviting(false);

      // Create access records for selected companies
      for (const cid of form.company_ids) {
        const existing = accessRecords.find(a => a.user_email === form.email && a.company_id === cid);
        if (!existing) {
          await base44.entities.UserCompanyAccess.create({
            user_email: form.email,
            user_name: form.name,
            company_id: cid,
            role: form.role,
          });
        } else {
          await base44.entities.UserCompanyAccess.update(existing.id, { role: form.role });
        }
      }

      setSheetOpen(false);
      setForm({ email: "", name: "", role: "standard", company_ids: [] });
      await loadData();
    } finally {
      setSaving(false);
      setInviting(false);
    }
  }

  async function handleUpdateAccess(userEmail, userName, companyId, checked) {
    if (checked) {
      await base44.entities.UserCompanyAccess.create({ user_email: userEmail, user_name: userName, company_id: companyId, role: "standard" });
    } else {
      const rec = accessRecords.find(a => a.user_email === userEmail && a.company_id === companyId);
      if (rec) await base44.entities.UserCompanyAccess.delete(rec.id);
    }
    await loadData();
  }

  async function handleRoleChange(userEmail, userName, role) {
    const recs = accessRecords.filter(a => a.user_email === userEmail);
    await Promise.all(recs.map(r => base44.entities.UserCompanyAccess.update(r.id, { role })));
    await loadData();
  }

  async function handleDelete(userEmail) {
    const recs = accessRecords.filter(a => a.user_email === userEmail);
    await Promise.all(recs.map(r => base44.entities.UserCompanyAccess.delete(r.id)));
    setDeleteTarget(null);
    await loadData();
  }

  const toggleCompany = (cid) => {
    setForm(f => ({
      ...f,
      company_ids: f.company_ids.includes(cid)
        ? f.company_ids.filter(id => id !== cid)
        : [...f.company_ids, cid],
    }));
  };

  // Build unique user list from access records + actual users
  const allEmails = [...new Set([
    ...users.map(u => u.email),
    ...accessRecords.map(a => a.user_email),
  ])];

  const filtered = allEmails.filter(email =>
    email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage employee access across companies</p>
        </div>
        <Button onClick={() => { setForm({ email: "", name: "", company_ids: [] }); setSheetOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4" /> Invite User
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No users yet</p>
          <p className="text-sm mt-1">Invite employees to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(email => {
            const user = users.find(u => u.email === email);
            const userCompanies = getCompaniesForUser(email);
            const userName = user?.full_name || accessRecords.find(a => a.user_email === email)?.user_name || "";
            return (
              <Card key={email}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                        {(userName || email)[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        {userName && <p className="font-medium text-slate-900 truncate">{userName}</p>}
                        <p className="text-sm text-slate-500 flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(() => {
                        const userRole = accessRecords.find(a => a.user_email === email)?.role || "standard";
                        const ri = ROLE_LABELS[userRole];
                        return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ri.color}`}>{ri.label}</span>;
                      })()}
                      <Badge variant="secondary" className="gap-1"><Building2 className="w-3 h-3" />{userCompanies.length} {userCompanies.length === 1 ? "company" : "companies"}</Badge>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(email)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Role + Company access */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide w-20">Role</p>
                      <Select
                        value={accessRecords.find(a => a.user_email === email)?.role || "standard"}
                        onValueChange={(val) => handleRoleChange(email, userName, val)}
                      >
                        <SelectTrigger className="w-36 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([val, ri]) => (
                            <SelectItem key={val} value={val}>
                              <span className="flex items-center gap-1.5">
                                {val === "manager" ? <ShieldCheck className="w-3 h-3 text-blue-600" /> : <User className="w-3 h-3 text-slate-500" />}
                                {ri.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-slate-400">{ROLE_LABELS[accessRecords.find(a => a.user_email === email)?.role || "standard"]?.desc}</span>
                    </div>
                    {companies.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Company Access</p>
                        <div className="flex flex-wrap gap-3">
                          {companies.map(c => {
                            const hasAccess = !!accessRecords.find(a => a.user_email === email && a.company_id === c.id);
                            return (
                              <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={hasAccess}
                                  onCheckedChange={(checked) => handleUpdateAccess(email, userName, c.id, checked)}
                                />
                                <span className="text-sm text-slate-700">{c.name}</span>
                              </label>
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

      {/* Invite Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite Employee</SheetTitle>
            <SheetDescription>Send an invitation and assign company access.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="employee@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(val) => setForm(f => ({ ...f, role: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([val, ri]) => (
                    <SelectItem key={val} value={val}>
                      <span className="flex flex-col">
                        <span className="font-medium">{ri.label}</span>
                        <span className="text-xs text-slate-500">{ri.desc}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to Companies</Label>
              {companies.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={form.company_ids.includes(c.id)}
                    onCheckedChange={() => toggleCompany(c.id)}
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: c.primary_color || "#3b82f6" }}>
                      {c.name[0]}
                    </div>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400">The user will receive an invitation email. They will only see the companies assigned above and will not have admin access.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.email} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {inviting ? "Sending invite..." : saving ? "Saving..." : "Invite & Assign"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{deleteTarget}</strong> from all companies. They will no longer be able to access any company data.
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