import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, X, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CustomerPicker({ customers, value, onChange, companyId, onCustomersUpdate }) {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newCust, setNewCust] = useState({ first_name: "", last_name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  const selected = customers.find(c => c.id === value);
  const q = search.toLowerCase().trim();
  const filtered = q
    ? customers.filter(c =>
        `${c.first_name} ${c.last_name} ${c.business_name || ""} ${c.email} ${c.phone} ${c.city || ""}`.toLowerCase().includes(q)
      ).slice(0, 20)
    : customers.slice(0, 20);

  async function handleCreate() {
    if (!newCust.first_name || !newCust.last_name) return;
    setSaving(true);
    const created = await base44.entities.Customer.create({ ...newCust, company_id: companyId, status: "active" });
    if (onCustomersUpdate) onCustomersUpdate(created);
    onChange(created.id);
    setShowNew(false);
    setNewCust({ first_name: "", last_name: "", phone: "", email: "" });
    setSearch("");
    setOpen(false);
    setSaving(false);
  }

  // Selected state
  if (selected && !open && !showNew) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <UserCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{selected.first_name} {selected.last_name}</p>
              {(selected.phone || selected.email) && (
                <p className="text-xs text-slate-400 truncate">{selected.phone || selected.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={() => { setOpen(true); setSearch(""); }} className="text-xs text-blue-600 hover:text-blue-700 px-1.5">Change</button>
            <button type="button" onClick={() => onChange("")} className="text-slate-400 hover:text-red-500 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <Input
          placeholder="Search by name, phone, email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          className="pl-8 text-sm h-9"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto z-[100]">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">
              {customers.length === 0 ? "No customers found. " : "No matches. "}
              <button type="button" onClick={() => { setShowNew(true); setOpen(false); }} className="text-blue-600 hover:underline font-medium">
                Add a new customer
              </button>
            </div>
          ) : (
            filtered.map(c => (
              <button
                type="button"
                key={c.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-b-0 flex items-center gap-2"
                onClick={() => { onChange(c.id); setSearch(""); setOpen(false); }}
              >
                <UserCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{c.first_name} {c.last_name}</span>
                  {c.phone && <span className="text-slate-400 text-xs ml-1">· {c.phone}</span>}
                  {c.email && !c.phone && <span className="text-slate-400 text-xs ml-1">· {c.email}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {!showNew && (
        <button type="button" onClick={() => setShowNew(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
          <Plus className="w-3 h-3" /> New customer
        </button>
      )}

      {showNew && (
        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-slate-600">New Customer</p>
          <div className="flex gap-1.5">
            <Input value={newCust.first_name} onChange={e => setNewCust(n => ({ ...n, first_name: e.target.value }))} placeholder="First name *" className="text-xs h-8" />
            <Input value={newCust.last_name} onChange={e => setNewCust(n => ({ ...n, last_name: e.target.value }))} placeholder="Last name *" className="text-xs h-8" />
          </div>
          <Input value={newCust.phone} onChange={e => setNewCust(n => ({ ...n, phone: e.target.value }))} placeholder="Phone (optional)" className="text-xs h-8" />
          <Input value={newCust.email} onChange={e => setNewCust(n => ({ ...n, email: e.target.value }))} placeholder="Email (optional)" className="text-xs h-8" />
          <div className="flex gap-1.5">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowNew(false)} className="flex-1 text-xs h-7">Cancel</Button>
            <Button type="button" size="sm" onClick={handleCreate} disabled={saving || !newCust.first_name || !newCust.last_name} className="flex-1 text-xs h-7 bg-blue-600 hover:bg-blue-700">
              {saving ? "Saving..." : "Add Customer"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}