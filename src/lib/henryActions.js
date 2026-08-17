import { base44 } from "@/api/base44Client";

// Maps spoken/written status words to the Job entity status enum values.
const STATUS_ALIASES = {
  new: "new",
  estimate: "estimated", estimated: "estimated",
  schedule: "scheduled", scheduled: "scheduled",
  "in progress": "in_progress", in_progress: "in_progress", progress: "in_progress", started: "in_progress",
  invoice: "invoiced", invoiced: "invoiced",
  complete: "completed", completed: "completed", finish: "completed", finished: "completed", done: "completed",
  cancel: "cancelled", cancelled: "cancelled", canceled: "cancelled",
  hold: "on_hold", "on hold": "on_hold", on_hold: "on_hold", paused: "on_hold",
  archive: "archived", archived: "archived",
};

export function normalizeStatus(word) {
  if (!word) return null;
  const key = String(word).toLowerCase().trim().replace(/\s+/g, " ");
  return STATUS_ALIASES[key] || STATUS_ALIASES[key.replace(/ /g, "_")] || null;
}

// Extract the numeric part of a job reference from speech or text.
// Handles "job 223", "job-223", "job223", "JOB-0223", "job number 223".
export function parseJobNumber(cmd) {
  const m = String(cmd || "").match(/job(?:\s+number)?[-\s]*(\d+)/i);
  return m ? m[1] : null;
}

// Find a company job whose job_number numeric part matches the given number.
export async function findJobByNumber(companyId, numStr) {
  if (!companyId || !numStr) return null;
  const jobs = await base44.entities.Job.filter({ company_id: companyId }).catch(() => []);
  const n = parseInt(numStr, 10);
  return jobs.find(j => {
    const m = j.job_number?.match(/(\d+)/);
    return m && parseInt(m[1], 10) === n;
  }) || null;
}

// Ordered status matchers — most specific phrases first.
const STATUS_PATTERNS = [
  { re: /in[\s-]?progress|started/i, status: "in_progress" },
  { re: /on[\s-]?hold|paused/i, status: "on_hold" },
  { re: /\bcomplete[d]?\b|\bfinish(?:ed)?\b|\bdone\b/i, status: "completed" },
  { re: /\bschedule[d]?\b/i, status: "scheduled" },
  { re: /\bestimate[d]?\b/i, status: "estimated" },
  { re: /\binvoice[d]?\b/i, status: "invoiced" },
  { re: /\bcancel(?:ed|led)?\b/i, status: "cancelled" },
  { re: /\barchiv(?:e|ed)\b/i, status: "archived" },
  { re: /\bnew\b/i, status: "new" },
];

// Detect a direct action from a free-form command (no LLM, pure regex).
// Returns { action, job_number, status? } or null.
export function detectAction(cmd) {
  const c = String(cmd || "");
  const jobNumber = parseJobNumber(c);

  // Create an invoice for a job
  if (jobNumber && /\b(create|generate|make|send|build)\s+(an?\s+)?invoice\b/i.test(c)) {
    return { action: "create_invoice", job_number: jobNumber };
  }

  if (!jobNumber) return null;

  // Status change commands need a status verb, OR start with an action verb
  const isStatusCmd =
    /\b(change|mark|set|update|move|make|status)\b/i.test(c) ||
    /^(complete|finish|cancel|schedule|archive|hold|start|invoice|reopen)\b/i.test(c);
  if (!isStatusCmd) return null;

  for (const { re, status } of STATUS_PATTERNS) {
    if (re.test(c)) return { action: "change_job_status", job_number: jobNumber, status };
  }
  return null;
}

// Create an invoice from a job, mirroring JobDetail.generateInvoice (without
// the Stripe checkout redirect — Henry just creates the invoice and the UI
// navigates to it).
export async function createInvoiceFromJob(job, company) {
  let line_items = job.line_items || [];
  let subtotal = job.total_amount || 0;

  if (job.estimate_id && line_items.length === 0) {
    const ests = await base44.entities.Estimate.filter({ id: job.estimate_id }).catch(() => []);
    if (ests[0]) {
      const est = ests[0];
      const opt = est.options?.[0];
      line_items = opt?.line_items || est.line_items || [];
      subtotal = opt?.subtotal || est.subtotal || opt?.total || est.total || 0;
    }
  }
  if (line_items.length === 0 && job.total_amount) {
    line_items = [{ description: job.title, quantity: 1, unit_price: job.total_amount, total: job.total_amount }];
  }

  const existingPayments = await base44.entities.Payment.filter({ job_id: job.id }).catch(() => []);
  const totalAlreadyPaid = existingPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const invoiceTotal = job.total_amount || subtotal;
  const allInv = await base44.entities.Invoice.list();
  const invoice_number = `INV-${String((allInv.length || 0) + 1).padStart(4, "0")}`;
  const newStatus = totalAlreadyPaid >= invoiceTotal ? "paid" : totalAlreadyPaid > 0 ? "partial" : "sent";

  const invoice = await base44.entities.Invoice.create({
    company_id: company.id,
    customer_id: job.customer_id,
    job_id: job.id,
    estimate_id: job.estimate_id || "",
    invoice_number,
    status: newStatus,
    line_items,
    subtotal,
    tax_rate: job.tax_rate || 0,
    tax_amount: Number((subtotal * ((job.tax_rate || 0) / 100)).toFixed(2)),
    discount: job.discount || 0,
    total: Number(invoiceTotal.toFixed(2)),
    amount_paid: totalAlreadyPaid,
    ...(newStatus === "paid" ? { paid_date: new Date().toISOString().split("T")[0] } : {}),
  });

  // Link any unlinked job payments to the new invoice
  await Promise.all(
    existingPayments.filter(p => !p.invoice_id).map(p => base44.entities.Payment.update(p.id, { invoice_id: invoice.id }))
  ).catch(() => {});

  return invoice;
}