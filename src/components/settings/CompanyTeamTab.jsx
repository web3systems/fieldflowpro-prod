import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserPlus, Trash2 } from 'lucide-react';

export default function CompanyTeamTab({ company }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('standard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeam();
  }, [company.id]);

  async function loadTeam() {
    try {
      const access = await base44.entities.UserCompanyAccess.filter({ company_id: company.id });
      setTeamMembers(access);
    } catch (e) {
      console.error('Error loading team:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteUser() {
    if (!inviteEmail.trim()) return;

    try {
      // Check if already a member
      const existing = teamMembers.find(m => m.user_email === inviteEmail);
      if (existing) {
        alert('User already a member of this company');
        return;
      }

      // Create access record
      await base44.entities.UserCompanyAccess.create({
        user_email: inviteEmail,
        company_id: company.id,
        role: inviteRole
      });

      // Send invitation email
      await base44.functions.invoke('sendInvitationEmail', {
        email: inviteEmail,
        company_id: company.id,
        company_name: company.name
      });

      setInviteEmail('');
      setInviteRole('standard');
      await loadTeam();
      alert('Invitation sent!');
    } catch (e) {
      console.error('Error inviting user:', e);
      alert('Error sending invitation');
    }
  }

  async function handleRemoveUser(memberId) {
    try {
      await base44.entities.UserCompanyAccess.delete(memberId);
      await loadTeam();
    } catch (e) {
      console.error('Error removing user:', e);
    }
  }

  async function handleChangeRole(memberId, newRole) {
    try {
      await base44.entities.UserCompanyAccess.update(memberId, { role: newRole });
      await loadTeam();
    } catch (e) {
      console.error('Error updating role:', e);
    }
  }

  if (loading) return <div className="p-4">Loading team...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage who has access to this company</CardDescription>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" /> Invite
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Invite Team Member</SheetTitle>
                <SheetDescription>Add a new user to your company</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard User</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInviteUser} className="w-full">
                  Send Invitation
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teamMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{member.user_name || member.user_email}</p>
                <p className="text-sm text-slate-500">{member.user_email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={member.role} onValueChange={(newRole) => handleChangeRole(member.id, newRole)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Remove user?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {member.user_name || member.user_email} will lose access to this company.
                    </AlertDialogDescription>
                    <div className="flex gap-2 justify-end">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRemoveUser(member.id)} className="bg-red-600">
                        Remove
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}