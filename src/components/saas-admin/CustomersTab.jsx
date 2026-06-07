import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronRight, AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import CompanyDetailPanel from './CompanyDetailPanel';

const STATUS_COLORS = {
  trialing: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
  paused: 'bg-yellow-100 text-yellow-700',
};

const PLAN_LABELS = {
  trial: 'Trial',
  starter: 'Starter',
  professional: 'Pro',
  enterprise: 'Enterprise',
};

export default function CustomersTab() {
  const [companies, setCompanies] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [cos, subs] = await Promise.all([
        base44.entities.Company.list('-created_date', 500),
        base44.entities.Subscription.list('-created_date', 500),
      ]);
      setCompanies(cos);
      setSubscriptions(subs);
    } finally {
      setLoading(false);
    }
  }

  const subMap = {};
  subscriptions.forEach(s => { subMap[s.company_id] = s; });

  const filtered = companies.filter(c => {
    const sub = subMap[c.id];
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      sub?.owner_email?.toLowerCase().includes(q) ||
      sub?.owner_name?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || (sub?.status === filterStatus) || (!sub && filterStatus === 'no_sub');
    return matchSearch && matchStatus;
  });

  // Summary counts
  const counts = {
    all: companies.length,
    trialing: subscriptions.filter(s => s.status === 'trialing').length,
    active: subscriptions.filter(s => s.status === 'active').length,
    past_due: subscriptions.filter(s => s.status === 'past_due').length,
    cancelled: subscriptions.filter(s => s.status === 'cancelled').length,
  };

  const selectedSub = selected ? subMap[selected.id] : null;

  if (loading) return <div className="p-4 text-slate-400">Loading companies...</div>;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.all, icon: TrendingUp, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Trialing', value: counts.trialing, icon: Clock, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Active', value: counts.active, icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Past Due', value: counts.past_due, icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company, email, owner..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['all', 'trialing', 'active', 'past_due', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize ${
                filterStatus === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? `All (${counts.all})` : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-slate-500 text-left">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Plan / Status</th>
              <th className="px-4 py-3 font-medium">Signed Up</th>
              <th className="px-4 py-3 font-medium">Trial / Billing</th>
              <th className="px-4 py-3 font-medium w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => {
              const sub = subMap[c.id];
              const trialDaysLeft = sub?.trial_ends_at
                ? differenceInDays(new Date(sub.trial_ends_at), new Date())
                : null;
              const isPastDue = sub?.status === 'past_due';
              const isTrialExpiring = trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft >= 0;
              const isTrialExpired = trialDaysLeft !== null && trialDaysLeft < 0;

              return (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${!c.is_active ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: c.primary_color || '#3b82f6' }}
                      >
                        {c.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.industry && <p className="text-xs text-slate-400 capitalize">{c.industry}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{sub?.owner_name || '—'}</p>
                    <p className="text-xs text-slate-400">{sub?.owner_email || c.email || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-600 capitalize">{PLAN_LABELS[sub?.plan] || '—'}</span>
                      {sub && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full w-fit ${STATUS_COLORS[sub.status] || 'bg-slate-100 text-slate-600'}`}>
                          {sub.status}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {c.created_date ? (
                      <>
                        <p>{format(new Date(c.created_date), 'MMM d, yyyy')}</p>
                        <p className="text-slate-400">{differenceInDays(new Date(), new Date(c.created_date))}d ago</p>
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {isPastDue && (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <AlertTriangle className="w-3 h-3" /> Past Due
                      </span>
                    )}
                    {isTrialExpiring && (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <Clock className="w-3 h-3" /> {trialDaysLeft}d left
                      </span>
                    )}
                    {isTrialExpired && sub?.status === 'trialing' && (
                      <span className="flex items-center gap-1 text-red-500 font-medium">
                        <XCircle className="w-3 h-3" /> Expired
                      </span>
                    )}
                    {!isPastDue && !isTrialExpiring && !isTrialExpired && sub?.trial_ends_at && (
                      <span className="text-slate-400">{format(new Date(sub.trial_ends_at), 'MMM d')}</span>
                    )}
                    {sub?.current_period_end && sub?.status === 'active' && (
                      <span className="text-slate-400">{format(new Date(sub.current_period_end), 'MMM d')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <ChevronRight className="w-4 h-4" />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">No companies match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} of {companies.length} companies shown</p>

      {/* Detail Panel */}
      {selected && (
        <CompanyDetailPanel
          company={selected}
          subscription={subMap[selected.id]}
          onClose={() => setSelected(null)}
          onRefresh={() => { load(); setSelected(null); }}
        />
      )}
    </div>
  );
}