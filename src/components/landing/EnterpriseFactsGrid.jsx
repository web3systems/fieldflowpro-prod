import { ENTERPRISE_FACTS } from "@/components/landing/enterpriseContent";

export default function EnterpriseFactsGrid() {
  return (
    <div className="mb-14 sm:mb-16">
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-5">FieldFlow Pro at a glance</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ENTERPRISE_FACTS.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">{label}</dt>
            <dd className="text-sm text-slate-600 leading-relaxed">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}