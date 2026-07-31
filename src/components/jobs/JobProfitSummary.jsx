import { useState } from "react";
import {
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Wrench, Package, Info, Calculator,
} from "lucide-react";

function fmt(n) {
  const v = isNaN(n) || n == null ? 0 : Number(n);
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Job Profit Summary
 *
 * Calculates total profit by comparing labor/material cost basis against the
 * actual invoice total (or planned job total if no invoice yet).
 *
 * Labor & material *costs* are derived from their sell prices via the company's
 * MarginRule markups — sell_price / (1 + markup%) = cost basis. Receipts capture
 * out-of-pocket material expenses already paid by technicians and are added
 * directly to total cost.
 */
export default function JobProfitSummary({ invoices = [], form, marginRule }) {
  const [expanded, setExpanded] = useState(true);

  const defaultMarkup = marginRule?.min_markup_pct ?? 30;
  const laborMarkup = marginRule?.labor_markup_pct != null ? marginRule.labor_markup_pct : defaultMarkup;
  const materialMarkup = marginRule?.materials_markup_pct != null ? marginRule.materials_markup_pct : defaultMarkup;

  // Revenue: only count active (non-void) invoices
  const activeInvoices = (invoices || []).filter((i) => i.status !== "void");
  const invoiceTotal = activeInvoices.reduce((s, inv) => s + (inv.total || 0), 0);

  // Fall back to planned job total when no invoices exist
  const plannedTotal = form?.total_amount || 0;
  const revenue = invoiceTotal > 0 ? invoiceTotal : plannedTotal;

  // Cost basis: prefer invoice line items (what we actually billed), else the job's planned items
  const invoiceItems = activeInvoices.flatMap((i) => i.line_items || []);
  const jobItems = form?.line_items || [];
  const useItems = invoiceItems.length > 0 ? invoiceItems : jobItems;

  const laborSold = useItems
    .filter((i) => (i.category || "service") !== "material")
    .reduce((s, i) => s + (i.total || 0), 0);
  const materialSold = useItems
    .filter((i) => i.category === "material")
    .reduce((s, i) => s + (i.total || 0), 0);

  const laborCost = laborMarkup > 0 ? laborSold / (1 + laborMarkup / 100) : laborSold;
  const materialCost = materialMarkup > 0 ? materialSold / (1 + materialMarkup / 100) : materialSold;

  const receipts = form?.receipts || [];
  const receiptTotal = receipts.reduce((s, r) => s + (r.total || 0), 0);

  const totalCost = laborCost + materialCost + receiptTotal;
  const profit = revenue - totalCost;
  const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  const hasInvoices = activeInvoices.length > 0;
  const missingMarginRule = !marginRule;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded((e) => !e)}
      >
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-500" /> Profit Summary
        </h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {!hasInvoices && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>No active invoices yet — figures use the planned job total. Generate an invoice to see real profit.</span>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric
              label="Invoice Total"
              value={`$${fmt(revenue)}`}
              sub={hasInvoices ? `${activeInvoices.length} invoice${activeInvoices.length === 1 ? "" : "s"}` : "Planned total"}
            />
            <Metric
              label="Labor Cost"
              value={`$${fmt(laborCost)}`}
              sub={`from $${fmt(laborSold)} sold · ${laborMarkup}% markup`}
              icon={Wrench}
            />
            <Metric
              label="Material Cost"
              value={`$${fmt(materialCost)}`}
              sub={receiptTotal > 0 ? `+ $${fmt(receiptTotal)} receipts` : `from $${fmt(materialSold)} sold · ${materialMarkup}% markup`}
              icon={Package}
            />
            <Metric
              label="Total Profit"
              value={`$${fmt(profit)}`}
              sub={`${profitPct.toFixed(1)}% margin`}
              tone={profit >= 0 ? "good" : "bad"}
              icon={profit >= 0 ? TrendingUp : TrendingDown}
            />
          </div>

          {missingMarginRule && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              Using default {defaultMarkup}% markup to estimate cost basis. Configure your company's Margin Rules in Settings for an accurate picture.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, sub, tone = "neutral", icon: Icon }) {
  const toneClasses =
    tone === "good"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : tone === "bad"
        ? "text-red-700 bg-red-50 border-red-200"
        : "text-slate-900 bg-white border-slate-200";
  return (
    <div className={`rounded-lg p-3 border ${toneClasses}`}>
      <p className="text-xs text-slate-500 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}