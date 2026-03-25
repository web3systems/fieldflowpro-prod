import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Link2, X, Briefcase, FileText, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const TYPE_CONFIG = {
  job: {
    label: "Job",
    icon: Briefcase,
    entity: "Job",
    idField: "customer_id",
    displayName: (r) => r.title,
    sub: (r) => r.scheduled_start ? format(new Date(r.scheduled_start), "MMM d, yyyy") : format(new Date(r.created_date), "MMM d, yyyy"),
    badge: (r) => r.status?.replace("_", " "),
    amount: (r) => r.total_amount,
  },
  estimate: {
    label: "Estimate",
    icon: FileText,
    entity: "Estimate",
    idField: "customer_id",
    displayName: (r) => r.title || r.estimate_number || "Estimate",
    sub: (r) => format(new Date(r.created_date), "MMM d, yyyy"),
    badge: (r) => r.status,
    amount: (r) => r.total,
  },
  invoice: {
    label: "Invoice",
    icon: DollarSign,
    entity: "Invoice",
    idField: "customer_id",
    displayName: (r) => `Invoice #${r.invoice_number || r.id?.slice(-6)}`,
    sub: (r) => format(new Date(r.created_date), "MMM d, yyyy"),
    badge: (r) => r.status,
    amount: (r) => r.total,
  },
};

export default function AssignRecordModal({ open, onClose, type, companyId, customerId, customerName, onAssigned }) {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  const config = TYPE_CONFIG[type];

  useEffect(() => {
    if (!open || !companyId || !type) return;
    setLoading(true);
    setSearch("");
    // Load ALL records for the company, excluding ones already assigned to this customer
    base44.entities[config.entity].filter({ company_id: companyId })
      .then(all => {
        // Show records not assigned to this customer (either unassigned or assigned to others)
        const unassigned = all.filter(r => !r[config.idField] || r[config.idField] !== customerId);
        setRecords(unassigned);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, companyId, type, customerId]);

  async function handleAssign(record) {
    setAssigning(record.id);
    await base44.entities[config.entity].update(record.id, { [config.idField]: customerId });
    setAssigning(null);
    onAssigned();
    onClose();
  }

  const filtered = records.filter(r => {
    const name = config.displayName(r)?.toLowerCase() || "";
    return name.includes(search.toLowerCase());
  });

  const Icon = config?.icon || Link2;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            Assign {config?.label} to {customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${config?.label?.toLowerCase()}s...`}
            className="pl-9"
          />
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="text-center text-slate-400 py-8 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-slate-400 py-8 text-sm">
              {records.length === 0
                ? `No unassigned ${config?.label?.toLowerCase()}s found for this company.`
                : `No results for "${search}".`}
            </div>
          ) : (
            filtered.map(record => (
              <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{config.displayName(record)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{config.sub(record)}</span>
                    {config.badge(record) && (
                      <Badge className="text-xs bg-slate-100 text-slate-600">{config.badge(record)}</Badge>
                    )}
                    {config.amount(record) > 0 && (
                      <span className="text-xs font-medium text-slate-600">${config.amount(record)?.toLocaleString()}</span>
                    )}
                  </div>
                  {record[config.idField] && record[config.idField] !== customerId && (
                    <p className="text-xs text-amber-600 mt-0.5">⚠ Currently assigned to another customer</p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-xs h-7"
                  onClick={() => handleAssign(record)}
                  disabled={assigning === record.id}
                >
                  {assigning === record.id ? "Assigning..." : "Assign"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}