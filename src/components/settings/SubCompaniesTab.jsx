import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Trash2, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const PLAN_LIMITS = {
  starter: 0,        // no sub-companies on starter
  professional: 3,
  enterprise: Infinity,
  trial: 1,
};

export default function SubCompaniesTab({ company, subscription, onSubCompanyCreated }) {
  const [subCompanies, setSubCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', state: '', phone: '', email: '' });

  const plan = subscription?.plan || 'trial';
  const limit = PLAN_LIMITS[plan] ?? 0;
  const atLimit = subCompanies.length >= limit;
  const canAddSubs = limit > 0;

  useEffect(() => {
    loadSubCompanies();
  }, [company?.id]);

  async function loadSubCompanies() {
    try {
      const subs = await base44.entities.Company.filter({ parent_company_id: company.id });
      setSubCompanies(subs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const sub = await base44.entities.Company.create({
        ...form,
        parent_company_id: company.id,
        is_active: true,
        industry: company.industry,
        primary_color: company.primary_color,
      });
      setSubCompanies(prev => [...prev, sub]);
      setShowModal(false);
      setForm({ name: '', city: '', state: '', phone: '', email: '' });
      if (onSubCompanyCreated) onSubCompanyCreated(sub);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this location? This will not delete its data.')) return;
    await base44.entities.Company.delete(id);
    setSubCompanies(prev => prev.filter(s => s.id !== id));
  }

  if (loading) return <div className="p-4 text-slate-500">Loading locations...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Locations / Sub-Companies
            </CardTitle>
            <CardDescription>
              {canAddSubs
                ? `Your ${plan} plan allows up to ${limit === Infinity ? 'unlimited' : limit} location${limit === 1 ? '' : 's'}. You have ${subCompanies.length} of ${limit === Infinity ? '∞' : limit}.`
                : 'Upgrade to Professional or Enterprise to add multiple locations.'}
            </CardDescription>
          </div>
          {canAddSubs && !atLimit && (
            <Button onClick={() => setShowModal(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Add Location
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!canAddSubs && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <strong>Starter plan</strong> includes one location (your main company). Upgrade to <strong>Professional</strong> for up to 3 locations or <strong>Enterprise</strong> for unlimited.
          </div>
        )}

        {canAddSubs && subCompanies.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No locations added yet.</p>
          </div>
        )}

        <div className="space-y-3 mt-2">
          {subCompanies.map(sub => (
            <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: sub.primary_color || '#3b82f6' }}
                >
                  {sub.name[0]}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{sub.name}</p>
                  {(sub.city || sub.state) && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[sub.city, sub.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Location</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-red-500 h-7 w-7"
                  onClick={() => handleDelete(sub.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {canAddSubs && atLimit && limit !== Infinity && (
          <p className="text-xs text-amber-600 mt-3 text-center">Location limit reached. Upgrade to Enterprise for unlimited locations.</p>
        )}
      </CardContent>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Location Name *</Label>
              <Input
                placeholder="e.g. Bob's Plumbing Vermont"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input placeholder="Burlington" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <Label>State</Label>
                <Input placeholder="VT" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input placeholder="(555) 000-0000" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input placeholder="location@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? 'Creating...' : 'Create Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}