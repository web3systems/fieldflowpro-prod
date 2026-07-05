import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, ChevronRight, ChevronDown, AlertTriangle, TrendingUp,
  Clock, CheckCircle, XCircle, Building2, GitBranch
} from 'lucide-react';
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
  const [expandedMasters, setExpandedMasters] = useState({});

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

  // Separate masters from subsidiaries
  const masterCompanies = companies.filter(c => !c.parent_company_id);
  const subsidiaryMap = companies.reduce((acc, c) => {
    if (c.parent_company_id) {
      acc[c.parent_company_id] = acc[c.parent_company_id] || [];
      acc[c.parent_company_id].push(c);
    }
    return acc;
  }, {});

  const filteredMasters = masterCompanies.filter(c => {
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

  // Counts based on master companies only (billing customers)
  const counts = {
    all: masterCompanies.length,
    trialing: masterCompanies.filter(c => subMap[c.id]?.status === 'trialing').length,
    active: masterCompanies.filter(c => subMap[c.id]?.status === 'active').length,
    past_due: masterCompanies.filter(c => subMap[c.id]?.status === 'past_due').length,
    cancelled: masterCompanies.filter(c => subMap[c.id]?.status === 'cancelled').length,
  };

  function toggleExpand(id, e) {
    e.stopPropagation();
    setExpandedMasters(prev => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) return <div className="p-4 text-slate-400">Loading companies...</div>;

  return (
    <div className="space-y-4">
      {/* Summary strip — master companies only */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Customers', value: counts.all, icon: TrendingUp, color: 'text-slate-700', bg: 'bg-slate-50' },
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

      <p className="text-xs text-slate-400">
        Showing {masterCompanies.length} billing customers · {companies.length - masterCompanies.length} subsidiaries managed within
      </p>

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
            {filteredMasters.map(c => {
              const sub = subMap[c.id];
              const subs = subsidiaryMap[c.id] || [];
              const isExpanded = expandedMasters[c.id];
              const trialDaysLeft = sub?.trial_ends_at
                ? differenceInDays(new Date(sub.trial_ends_at), new Date())
                : null;
              const isPastDue = sub?.status === 'past_due';
              const isTrialExpiring = trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft >= 0;
              const isTrialExpired = trialDaysLeft !== null && trialDaysLeft < 0;

              return (
                <>
                  {/* Master row */}
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
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          {c.industry && <p className="text-xs text-slate-400 capitalize">{c.industry}</p>}
                        </div>
                        {subs.length > 0 && (
                          <button
                            onClick={e => toggleExpand(c.id, e)}
                            className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-medium transition-colors"
                          >
                            <GitBranch className="w-3 h-3" />
                            {subs.length}
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        )}
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
                      {isPastDue && <span className="flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="w-3 h-3" /> Past Due</span>}
                      {isTrialExpiring && <span className="flex items-center gap-1 text-amber-600 font-medium"><Clock className="w-3 h-3" /> {trialDaysLeft}d left</span>}
                      {isTrialExpired && sub?.status === 'trialing' && <span className="flex items-center gap-1 text-red-500 font-medium"><XCircle className="w-3 h-3" /> Expired</span>}
                      {!isPastDue && !isTrialExpiring && !isTrialExpired && sub?.trial_ends_at && <span className="text-slate-400">{format(new Date(sub.trial_ends_at), 'MMM d')}</span>}
                      {sub?.current_period_end && sub?.status === 'active' && <span className="text-slate-400">{format(new Date(sub.current_period_end), 'MMM d')}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>

                  {/* Subsidiary rows */}
                  {isExpanded && subs.map(sub_c => (
                    <tr
                      key={sub_c.id}
                      onClick={() => setSelected(sub_c)}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors bg-slate-50/50 border-l-2 border-l-blue-200"
                    >
                      <td className="px-4 py-2 pl-10">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: sub_c.primary_color || '#64748b' }}
                          >
                            {sub_c.name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-700 text-sm">{sub_c.name}</p>
                            {sub_c.industry && <p className="text-xs text-slate-400 capitalize">{sub_c.industry}</p>}
                          </div>
                          <span className="ml-1 text-xs text-slate-400 italic">subsidiary</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <p className="text-xs text-slate-500">{sub_c.email || '—'}</p>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs text-slate-400 italic">Managed by parent</span>
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-xs">
                        {sub_c.created_date ? format(new Date(sub_c.created_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${sub_c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {sub_c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-300">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
            {filteredMasters.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">No companies match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">{filteredMasters.length} of {masterCompanies.length} customers shown</p>

      {selected && (
        <CompanyDetailPanel
          company={selected}
          subscription={subMap[selected.id]}
          allCompanies={companies}
          onClose={() => setSelected(null)}
          onRefresh={() => { load(); setSelected(null); }}
        />
      )}
    </div>
  );
}