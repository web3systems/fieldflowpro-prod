import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, FileText, Receipt, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function SyncModal({ open, onClose, companyId, onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState(null);

  async function runSync() {
    setSyncing(true);
    setResults(null);

    // Load all source data + existing synced transactions in parallel
    const [invoices, jobs, existingTxns] = await Promise.all([
      base44.entities.Invoice.filter({ company_id: companyId }),
      base44.entities.Job.filter({ company_id: companyId }),
      base44.entities.AccountingTransaction.filter({ company_id: companyId }),
    ]);

    const existingSourceIds = new Set(existingTxns.map(t => t.source_id).filter(Boolean));

    const created = { invoices: 0, receipts: 0, payments: 0 };
    const skipped = { invoices: 0, receipts: 0, payments: 0 };

    // 1. Sync paid invoices as income
    const paidInvoices = invoices.filter(i => i.status === "paid" && !existingSourceIds.has(i.id));
    const skippedInvoices = invoices.filter(i => i.status === "paid" && existingSourceIds.has(i.id));
    skipped.invoices = skippedInvoices.length;

    for (const inv of paidInvoices) {
      await base44.entities.AccountingTransaction.create({
        company_id: companyId,
        date: inv.paid_date || inv.updated_date?.slice(0, 10) || format(new Date(), "yyyy-MM-dd"),
        description: `Invoice ${inv.invoice_number || inv.id.slice(0, 8)}`,
        amount: inv.total || 0,
        type: "income",
        category: "Service Revenue",
        source: "invoice",
        source_id: inv.id,
        status: "cleared",
      });
      created.invoices++;
    }

    // 2. Sync job receipts as expenses
    for (const job of jobs) {
      if (!job.receipts?.length) continue;
      for (const receipt of job.receipts) {
        const receiptKey = `receipt_${receipt.id || receipt.image_url}`;
        if (existingSourceIds.has(receiptKey)) {
          skipped.receipts++;
          continue;
        }
        if (!receipt.total && !receipt.amount) continue;
        await base44.entities.AccountingTransaction.create({
          company_id: companyId,
          date: receipt.date || job.scheduled_start?.slice(0, 10) || format(new Date(), "yyyy-MM-dd"),
          description: `Receipt: ${receipt.vendor || "Unknown Vendor"} (Job: ${job.title})`,
          amount: receipt.total || receipt.amount || 0,
          type: "expense",
          category: receipt.category || "Job Expenses",
          source: "import",
          source_id: receiptKey,
          status: "cleared",
          notes: receipt.notes || "",
        });
        created.receipts++;
      }
    }

    // 3. Sync partial/overpaid invoices as payments
    const partialInvoices = invoices.filter(i =>
      i.status === "partial" && i.amount_paid > 0 && !existingSourceIds.has(`partial_${i.id}`)
    );
    const skippedPartials = invoices.filter(i =>
      i.status === "partial" && existingSourceIds.has(`partial_${i.id}`)
    );
    skipped.payments = skippedPartials.length;

    for (const inv of partialInvoices) {
      await base44.entities.AccountingTransaction.create({
        company_id: companyId,
        date: inv.updated_date?.slice(0, 10) || format(new Date(), "yyyy-MM-dd"),
        description: `Partial Payment - Invoice ${inv.invoice_number || inv.id.slice(0, 8)}`,
        amount: inv.amount_paid || 0,
        type: "income",
        category: "Service Revenue",
        source: "payment",
        source_id: `partial_${inv.id}`,
        status: "cleared",
      });
      created.payments++;
    }

    setResults({ created, skipped, total: created.invoices + created.receipts + created.payments });
    setSyncing(false);
    onSynced();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            Sync Data to Accounting
          </DialogTitle>
        </DialogHeader>

        {!results && !syncing && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">This will import the following into your accounting transactions:</p>
            <div className="space-y-2">
              {[
                { icon: FileText, label: "Paid invoices", desc: "Synced as income transactions", color: "text-green-600" },
                { icon: DollarSign, label: "Partial payments", desc: "Synced as partial income", color: "text-blue-600" },
                { icon: Receipt, label: "Job receipts", desc: "Synced as expense transactions", color: "text-red-600" },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">Already-synced records are skipped automatically. Safe to run multiple times.</p>
            <Button onClick={runSync} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
              <RefreshCw className="w-4 h-4" /> Start Sync
            </Button>
          </div>
        )}

        {syncing && (
          <div className="flex flex-col items-center gap-3 py-8">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">Syncing records...</p>
            <p className="text-xs text-slate-400">This may take a moment</p>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 p-3 rounded-lg ${results.total > 0 ? "bg-green-50" : "bg-slate-50"}`}>
              <CheckCircle className={`w-5 h-5 ${results.total > 0 ? "text-green-600" : "text-slate-400"}`} />
              <p className="text-sm font-semibold text-slate-800">
                {results.total > 0 ? `${results.total} records synced successfully` : "Everything already up to date"}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "Paid invoices", created: results.created.invoices, skipped: results.skipped.invoices },
                { label: "Partial payments", created: results.created.payments, skipped: results.skipped.payments },
                { label: "Job receipts", created: results.created.receipts, skipped: results.skipped.receipts },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-700">{row.label}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-700 font-medium">+{row.created} new</span>
                    <span className="text-slate-400">{row.skipped} skipped</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setResults(null); runSync(); }} variant="outline" size="sm" className="gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Sync Again
              </Button>
              <Button onClick={onClose} className="flex-1 bg-indigo-600 hover:bg-indigo-700">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}