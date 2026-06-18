import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function SortDropdown({ fields, sortField, sortDir, onSort }) {
  const current = fields.find(f => f.value === sortField);

  return (
    <div className="flex items-center gap-1">
      <select
        value={sortField}
        onChange={e => onSort(e.target.value, sortDir)}
        className="h-8 text-xs bg-white border border-slate-200 rounded-lg px-2.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Sort by...</option>
        {fields.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      {sortField && (
        <button
          onClick={() => onSort(sortField, sortDir === "asc" ? "desc" : "asc")}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500"
          title={sortDir === "asc" ? "Ascending" : "Descending"}
        >
          {sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}