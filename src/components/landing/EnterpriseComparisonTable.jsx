import { ENTERPRISE_COMPARISON, COMPARISON_NOTE } from "@/components/landing/enterpriseContent";

const COLUMNS = ["Platform", "Best for", "Pricing", "Rollout"];

export default function EnterpriseComparisonTable() {
  return (
    <div>
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-5">
        Enterprise field service management software compared
      </h3>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              {COLUMNS.map((col) => (
                <th key={col} scope="col" className="py-3.5 px-4 font-semibold text-slate-700">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ENTERPRISE_COMPARISON.map((row) => (
              <tr
                key={row.name}
                className={`border-b border-slate-100 last:border-0 align-top ${row.highlight ? "bg-blue-50/60" : "bg-white"}`}
              >
                <th scope="row" className={`py-3.5 px-4 text-left font-semibold ${row.highlight ? "text-blue-700" : "text-slate-800"}`}>
                  {row.name}
                </th>
                <td className="py-3.5 px-4 text-slate-600">{row.bestFor}</td>
                <td className="py-3.5 px-4 text-slate-600">{row.pricing}</td>
                <td className="py-3.5 px-4 text-slate-600">{row.rollout}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-slate-400 text-xs mt-4 leading-relaxed">{COMPARISON_NOTE}</p>
    </div>
  );
}