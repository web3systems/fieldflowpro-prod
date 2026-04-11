import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const statusColors = {
  trialing: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-700',
  paused: 'bg-yellow-100 text-yellow-700',
};

export default function CustomersTab() {
  const [companies, setCompanies] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.asServiceRole.entities.Company.list('-created_date'),
      base44.asServiceRole.entities.Subscription.list(),
    ]).then(([cos, subs]) => {
      setCompanies(cos);
      setSubscriptions(subs);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Loading customers...</div>;

  const subMap = {};
  subscriptions.forEach(s => { subMap[s.company_id] = s; });

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{companies.length} companies registered</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-slate-500 text-left">
              <th className="pb-2 pr-4 font-medium">Company</th>
              <th className="pb-2 pr-4 font-medium">Owner Email</th>
              <th className="pb-2 pr-4 font-medium">Plan</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium">Trial Ends</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => {
              const sub = subMap[c.id];
              return (
                <tr key={c.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-900">{c.name}</td>
                  <td className="py-3 pr-4 text-slate-600">{sub?.owner_email || c.email || '—'}</td>
                  <td className="py-3 pr-4 capitalize">{sub?.plan || '—'}</td>
                  <td className="py-3 pr-4">
                    {sub ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[sub.status] || 'bg-slate-100 text-slate-600'}`}>
                        {sub.status}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 text-slate-500">
                    {sub?.trial_ends_at ? format(new Date(sub.trial_ends_at), 'MMM d, yyyy') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}