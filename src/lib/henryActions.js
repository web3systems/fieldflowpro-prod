import { base44 } from "@/api/base44Client";
import { HENRY_SYSTEM_PROMPT } from "@/lib/henryBrain";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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

export function parseJobNumber(cmd) {
  const m = String(cmd || "").match(/job(?:\s+number)?[-\s]*(\d+)/i);
  return m ? m[1] : null;
}

export async function findJobByNumber(companyId, numStr) {
  if (!companyId || !numStr) return null;
  const jobs = await base44.entities.Job.filter({ company_id: companyId }).catch(() => []);
  const n = parseInt(numStr, 10);
  return jobs.find(j => {
    const m = j.job_number?.match(/(\d+)/);
    return m && parseInt(m[1], 10) === n;
  }) || null;
}

async function findCustomerByName(companyId, name) {
  if (!companyId || !name) return null;
  const list = await base44.entities.Customer.filter({ company_id: companyId }).catch(() => []);
  const q = name.toLowerCase();
  return list.find(c => {
    const full = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().trim();
    const biz = (c.business_name || "").toLowerCase();
    return full === q || full.includes(q) || q.includes(full) || biz.includes(q);
  }) || null;
}

async function findLeadByName(companyId, name) {
  if (!companyId || !name) return null;
  const list = await base44.entities.Lead.filter({ company_id: companyId }).catch(() => []);
  const q = name.toLowerCase();
  return list.find(l => {
    const full = `${l.first_name || ""} ${l.last_name || ""}`.toLowerCase().trim();
    return full === q || full.includes(q) || q.includes(full);
  }) || null;
}

async function findTechByName(companyId, name) {
  if (!companyId || !name) return null;
  const list = await base44.entities.Technician.filter({ company_id: companyId }).catch(() => []);
  const q = name.toLowerCase();
  return list.find(t => `${t.first_name} ${t.last_name}`.toLowerCase().includes(q)) || null;
}

async function findInvoiceByJob(jobId) {
  const invs = await base44.entities.Invoice.filter({ job_id: jobId }).catch(() => []);
  return invs.filter(i => i.status !== "void").sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
}

async function findInvoiceByNumber(companyId, numStr) {
  const invs = await base44.entities.Invoice.filter({ company_id: companyId }).catch(() => []);
  const n = parseInt(numStr, 10);
  return invs.find(i => {
    const m = i.invoice_number?.match(/(\d+)/);
    return m && parseInt(m[1], 10) === n;
  }) || null;
}

async function findEstimateByNumber(companyId, numStr) {
  const list = await base44.entities.Estimate.filter({ company_id: companyId }).catch(() => []);
  const n = parseInt(numStr, 10);
  return list.find(e => {
    const m = e.estimate_number?.match(/(\d+)/);
    return m && parseInt(m[1], 10) === n;
  }) || null;
}

async function findTaskByTitle(companyId, title) {
  if (!companyId || !title) return null;
  const list = await base44.entities.Task.filter({ company_id: companyId }).catch(() => []);
  const q = title.toLowerCase();
  return list.find(t => (t.title || "").toLowerCase().includes(q) && t.status !== "completed") || null;
}

const PAYMENT_METHODS = {
  cash: "cash", check: "check", card: "card", credit: "card", stripe: "stripe",
  venmo: "venmo", zelle: "zelle", bank: "bank_transfer", transfer: "bank_transfer", "bank transfer": "bank_transfer", other: "other",
};

function normPaymentMethod(m) {
  if (!m) return "cash";
  return PAYMENT_METHODS[m.toLowerCase().trim()] || "other";
}

async function audit(ctx, action, entityType, entityId, notes) {
  base44.entities.AuditLog.create({
    company_id: ctx.company.id, action, entity_type: entityType, entity_id: entityId, notes,
    performed_by_id: ctx.user?.id, performed_by_name: ctx.user?.full_name, performed_by_email: ctx.user?.email,
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Invoice creation from a job (mirrors JobDetail.generateInvoice)
// ---------------------------------------------------------------------------

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
    company_id: company.id, customer_id: job.customer_id, job_id: job.id, estimate_id: job.estimate_id || "",
    invoice_number, status: newStatus, line_items, subtotal,
    tax_rate: job.tax_rate || 0, tax_amount: Number((subtotal * ((job.tax_rate || 0) / 100)).toFixed(2)),
    discount: job.discount || 0, total: Number(invoiceTotal.toFixed(2)), amount_paid: totalAlreadyPaid,
    ...(newStatus === "paid" ? { paid_date: new Date().toISOString().split("T")[0] } : {}),
  });
  await Promise.all(
    existingPayments.filter(p => !p.invoice_id).map(p => base44.entities.Payment.update(p.id, { invoice_id: invoice.id }))
  ).catch(() => {});
  return invoice;
}

// ---------------------------------------------------------------------------
// Action registry — each action the LLM can choose.
// run(ctx, params) -> { reply, followup? }
// followup = { action, params, question }  (sets a yes/no pending action)
// ---------------------------------------------------------------------------

export const ACTION_REGISTRY = [
  {
    name: "change_job_status",
    description: "Change a job's status by job number",
    paramsDesc: "{ job_number: string (digits), status: string (new, estimated, scheduled, in_progress, invoiced, completed, cancelled, on_hold, archived) }",
    confirm: false,
    async run(ctx, { job_number, status }) {
      const job = await findJobByNumber(ctx.company.id, job_number);
      if (!job) return { reply: `I couldn't find a job number ${job_number}.` };
      const st = normalizeStatus(status);
      if (!st) return { reply: `I didn't recognize the status "${status}". Try: scheduled, in progress, completed, cancelled, or on hold.` };
      await base44.entities.Job.update(job.id, { status: st });
      await audit(ctx, "status_change", "Job", job.id, `Status changed to "${st}" by Henry AI`);
      let reply = `Done — ${job.job_number || "job " + job_number} (${job.title}) is now ${st.replace("_", " ")}.`;
      let followup = null;
      if (st === "completed") {
        const invs = await base44.entities.Invoice.filter({ job_id: job.id }).catch(() => []);
        if (!invs.some(i => i.status !== "void")) {
          followup = { action: "create_invoice_for_job", params: { job_number }, question: "Would you like me to create an invoice for this job?" };
        }
      }
      return { reply, followup };
    },
  },
  {
    name: "create_invoice_for_job",
    description: "Create an invoice from a job's line items and open it",
    paramsDesc: "{ job_number: string (digits) }",
    confirm: false,
    async run(ctx, { job_number }) {
      const job = await findJobByNumber(ctx.company.id, job_number);
      if (!job) return { reply: `I couldn't find a job number ${job_number}.` };
      const inv = await createInvoiceFromJob(job, ctx.company);
      if (ctx.navigate) ctx.navigate(`/InvoiceDetail/${inv.id}`);
      return { reply: `I created invoice ${inv.invoice_number} for $${(inv.total || 0).toFixed(2)}. Opening it now.` };
    },
  },
  {
    name: "assign_job",
    description: "Assign a technician to a job by name",
    paramsDesc: "{ job_number: string, tech_name: string }",
    confirm: false,
    async run(ctx, { job_number, tech_name }) {
      const job = await findJobByNumber(ctx.company.id, job_number);
      if (!job) return { reply: `I couldn't find job ${job_number}.` };
      const tech = await findTechByName(ctx.company.id, tech_name);
      if (!tech) return { reply: `I couldn't find a technician named ${tech_name}.` };
      await base44.entities.Job.update(job.id, { assigned_techs: [tech.id] });
      return { reply: `Assigned ${tech.first_name} ${tech.last_name} to ${job.job_number}.` };
    },
  },
  {
    name: "add_job_note",
    description: "Add an internal note to a job",
    paramsDesc: "{ job_number: string, note: string }",
    confirm: false,
    async run(ctx, { job_number, note }) {
      const job = await findJobByNumber(ctx.company.id, job_number);
      if (!job) return { reply: `I couldn't find job ${job_number}.` };
      const log = [...(job.internal_notes_log || []), { content: note, created_at: new Date().toISOString(), created_by: ctx.user?.id }];
      await base44.entities.Job.update(job.id, { internal_notes: ((job.internal_notes || "") + "\n" + note).trim(), internal_notes_log: log });
      return { reply: `Added a note to ${job.job_number}.` };
    },
  },
  {
    name: "schedule_job",
    description: "Schedule a job for a date and time (adds an appointment)",
    paramsDesc: "{ job_number: string, date: string (YYYY-MM-DD), time: string (HH:MM 24h, default 08:00) }",
    confirm: false,
    async run(ctx, { job_number, date, time }) {
      const job = await findJobByNumber(ctx.company.id, job_number);
      if (!job) return { reply: `I couldn't find job ${job_number}.` };
      const t = time || "08:00";
      const start = `${date}T${t}`;
      const endDt = new Date(start); endDt.setHours(endDt.getHours() + 2);
      const appts = [...(job.appointments || []), { id: String(Date.now()), scheduled_start: start, scheduled_end: endDt.toISOString().slice(0, 16), status: "upcoming", assigned_techs: job.assigned_techs || [] }];
      await base44.entities.Job.update(job.id, { appointments: appts, status: job.status === "new" ? "scheduled" : job.status });
      return { reply: `Scheduled ${job.job_number} for ${date} at ${t}.` };
    },
  },
  {
    name: "delete_job",
    description: "Delete a job permanently",
    paramsDesc: "{ job_number: string }",
    confirm: true,
    async run(ctx, { job_number }) {
      const job = await findJobByNumber(ctx.company.id, job_number);
      if (!job) return { reply: `I couldn't find job ${job_number}.` };
      await base44.entities.Job.delete(job.id);
      return { reply: `Deleted ${job.job_number} (${job.title}).` };
    },
  },
  {
    name: "send_invoice",
    description: "Email an invoice to the customer (routes through manager review queue for non-admins)",
    paramsDesc: "{ job_number?: string, invoice_number?: string (digits) }",
    confirm: true,
    async run(ctx, { job_number, invoice_number }) {
      let invoice;
      if (invoice_number) invoice = await findInvoiceByNumber(ctx.company.id, invoice_number);
      else if (job_number) { const job = await findJobByNumber(ctx.company.id, job_number); if (job) invoice = await findInvoiceByJob(job.id); }
      if (!invoice) return { reply: "I couldn't find an invoice to send. Create one first." };
      const res = await base44.functions.invoke("sendEstimateOrInvoice", { invoice_id: invoice.id, customer_id: invoice.customer_id, contact_method: "email", company_id: ctx.company.id });
      if (res?.data?.queued) return { reply: `Invoice ${invoice.invoice_number} went to the manager review queue for approval.` };
      if (res?.data?.success) return { reply: `Invoice ${invoice.invoice_number} was emailed to the customer.` };
      return { reply: `I couldn't send the invoice: ${res?.data?.error || "unknown error"}.` };
    },
  },
  {
    name: "record_payment",
    description: "Record a payment against a job's invoice and update its balance",
    paramsDesc: "{ job_number?: string, invoice_number?: string, amount: number, method?: string (cash, check, card, venmo, zelle, bank_transfer) }",
    confirm: false,
    async run(ctx, { job_number, invoice_number, amount, method }) {
      let invoice;
      if (invoice_number) invoice = await findInvoiceByNumber(ctx.company.id, invoice_number);
      else if (job_number) { const job = await findJobByNumber(ctx.company.id, job_number); if (job) invoice = await findInvoiceByJob(job.id); }
      if (!invoice) return { reply: "I couldn't find an invoice to record that payment against." };
      const paid = parseFloat(amount);
      if (!paid || paid <= 0) return { reply: "How much was paid? Tell me the amount and I'll record it." };
      const m = normPaymentMethod(method);
      const date = new Date().toISOString().split("T")[0];
      await base44.entities.Payment.create({ company_id: ctx.company.id, job_id: invoice.job_id || "", invoice_id: invoice.id, amount: paid, payment_method: m, payment_type: "final", received_date: date, recorded_by: ctx.user?.full_name || ctx.user?.email || "Henry" });
      const newAmountPaid = (invoice.amount_paid || 0) + paid;
      const newStatus = newAmountPaid >= (invoice.total || 0) ? "paid" : "partial";
      await base44.entities.Invoice.update(invoice.id, { amount_paid: newAmountPaid, status: newStatus, paid_date: newStatus === "paid" ? date : (invoice.paid_date || undefined), payment_method: m });
      return { reply: newStatus === "paid"
        ? `Recorded a $${paid.toFixed(2)} ${m} payment on ${invoice.invoice_number}. It's now paid in full.`
        : `Recorded a $${paid.toFixed(2)} ${m} payment on ${invoice.invoice_number}. Balance remaining: $${((invoice.total || 0) - newAmountPaid).toFixed(2)}.` };
    },
  },
  {
    name: "send_estimate",
    description: "Email an estimate to the customer (routes through manager review queue for non-admins)",
    paramsDesc: "{ estimate_number?: string (digits), job_number?: string }",
    confirm: true,
    async run(ctx, { estimate_number, job_number }) {
      let est;
      if (estimate_number) est = await findEstimateByNumber(ctx.company.id, estimate_number);
      else if (job_number) { const job = await findJobByNumber(ctx.company.id, job_number); if (job?.estimate_id) { const e = await base44.entities.Estimate.filter({ id: job.estimate_id }); est = e[0]; } }
      if (!est) return { reply: "I couldn't find an estimate to send." };
      const res = await base44.functions.invoke("sendEstimateOrInvoice", { estimate_id: est.id, customer_id: est.customer_id, contact_method: "email", company_id: ctx.company.id });
      if (res?.data?.queued) return { reply: `Estimate ${est.estimate_number} went to the manager review queue.` };
      if (res?.data?.success) return { reply: `Estimate ${est.estimate_number} was emailed to the customer.` };
      return { reply: `I couldn't send the estimate: ${res?.data?.error || "unknown error"}.` };
    },
  },
  {
    name: "approve_estimate",
    description: "Mark an estimate as approved",
    paramsDesc: "{ estimate_number: string (digits) }",
    confirm: false,
    async run(ctx, { estimate_number }) {
      const est = await findEstimateByNumber(ctx.company.id, estimate_number);
      if (!est) return { reply: `I couldn't find estimate ${estimate_number}.` };
      await base44.entities.Estimate.update(est.id, { status: "approved" });
      return { reply: `Marked estimate ${est.estimate_number} as approved.` };
    },
  },
  {
    name: "create_customer",
    description: "Create a new customer",
    paramsDesc: "{ first_name: string, last_name: string, phone?: string, email?: string }",
    confirm: false,
    async run(ctx, { first_name, last_name, phone, email }) {
      if (!first_name || !last_name) return { reply: "I need at least a first and last name to create a customer." };
      await base44.entities.Customer.create({ company_id: ctx.company.id, first_name, last_name, phone: phone || "", email: email || "", status: "active" });
      return { reply: `Created customer ${first_name} ${last_name}.` };
    },
  },
  {
    name: "add_customer_note",
    description: "Add a note to a customer's record",
    paramsDesc: "{ customer_name: string, note: string }",
    confirm: false,
    async run(ctx, { customer_name, note }) {
      const c = await findCustomerByName(ctx.company.id, customer_name);
      if (!c) return { reply: `I couldn't find a customer named ${customer_name}.` };
      await base44.entities.Customer.update(c.id, { notes: ((c.notes || "") + "\n" + note).trim() });
      return { reply: `Added a note to ${c.first_name} ${c.last_name}.` };
    },
  },
  {
    name: "create_lead",
    description: "Create a new lead",
    paramsDesc: "{ first_name: string, last_name: string, phone?: string, service_interest?: string }",
    confirm: false,
    async run(ctx, { first_name, last_name, phone, service_interest }) {
      if (!first_name) return { reply: "I need a name to create a lead." };
      await base44.entities.Lead.create({ company_id: ctx.company.id, first_name, last_name: last_name || "", phone: phone || "", service_interest: service_interest || "", status: "new" });
      return { reply: `Created a new lead for ${first_name} ${last_name || ""}.` };
    },
  },
  {
    name: "update_lead_status",
    description: "Update a lead's status",
    paramsDesc: "{ lead_name: string, status: string (new, contacted, qualified, proposal_sent, won, lost) }",
    confirm: false,
    async run(ctx, { lead_name, status }) {
      const lead = await findLeadByName(ctx.company.id, lead_name);
      if (!lead) return { reply: `I couldn't find a lead named ${lead_name}.` };
      const valid = ["new", "contacted", "qualified", "proposal_sent", "won", "lost"];
      const st = valid.find(s => s.startsWith(String(status || "").toLowerCase()));
      if (!st) return { reply: `I didn't recognize that lead status.` };
      await base44.entities.Lead.update(lead.id, { status: st });
      return { reply: `Moved ${lead.first_name} ${lead.last_name} to ${st.replace("_", " ")}.` };
    },
  },
  {
    name: "create_task",
    description: "Create a new task",
    paramsDesc: "{ title: string, priority?: string (low, medium, high, urgent) }",
    confirm: false,
    async run(ctx, { title, priority }) {
      if (!title) return { reply: "What's the task?" };
      const p = ["low", "medium", "high", "urgent"].includes(String(priority || "").toLowerCase()) ? priority.toLowerCase() : "medium";
      await base44.entities.Task.create({ company_id: ctx.company.id, title, priority: p, status: "todo" });
      return { reply: `Created a task: ${title}.` };
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as completed by title",
    paramsDesc: "{ task_title: string }",
    confirm: false,
    async run(ctx, { task_title }) {
      const t = await findTaskByTitle(ctx.company.id, task_title);
      if (!t) return { reply: `I couldn't find an open task matching "${task_title}".` };
      await base44.entities.Task.update(t.id, { status: "completed" });
      return { reply: `Marked "${t.title}" as completed.` };
    },
  },
  {
    name: "navigate",
    description: "Navigate the user to a page in the app",
    paramsDesc: "{ page: string (estimates, jobs, schedule, dispatch, invoices, payments, accounting, customers, leads, tasks, team, settings, marketplace, reports, inventory, pricebook, templates, timeclock, map, notifications, messages, support, documentation, dashboard, newjob, newestimate, newinvoice) }",
    confirm: false,
    async run(ctx, { page }) {
      const PAGES = {
        estimates: "/Estimates", jobs: "/Jobs", schedule: "/Schedule", dispatch: "/Dispatch",
        invoices: "/Invoices", payments: "/Payments", accounting: "/Accounting", customers: "/Customers",
        leads: "/Leads", tasks: "/Tasks", team: "/CompanySettings", settings: "/CompanySettings",
        marketplace: "/Marketplace", reports: "/Reports", inventory: "/Inventory", pricebook: "/PriceBook",
        templates: "/JobTemplates", timeclock: "/TimeClock", map: "/TimeClockMap", notifications: "/Notifications",
        messages: "/Messages", support: "/Support", documentation: "/Documentation", dashboard: "/Dashboard",
        newjob: "/NewJob", newestimate: "/NewEstimate", newinvoice: "/NewInvoice",
      };
      const path = PAGES[String(page || "").toLowerCase()] || `/${page}`;
      if (ctx.navigate) ctx.navigate(path);
      return { reply: `Opening ${page}.` };
    },
  },
];

export async function runHenryAction(name, params, ctx) {
  const action = ACTION_REGISTRY.find(a => a.name === name);
  if (!action) return { reply: "I don't know how to do that yet — but I can learn it." };
  return await action.run(ctx, params || {});
}

// ---------------------------------------------------------------------------
// LLM dispatcher: decide whether to reply or take an action
// ---------------------------------------------------------------------------

export async function henryDecideAction(userMessage, context, extraTraining) {
  const actionList = ACTION_REGISTRY.map(a =>
    `- ${a.name}: ${a.description}. params: ${a.paramsDesc}${a.confirm ? " (requires confirmation before running)" : ""}`
  ).join("\n");

  const trainingBlock = extraTraining && extraTraining.trim()
    ? `\n\n--- COMPANY-SPECIFIC TRAINING (follow these closely) ---\n${extraTraining.trim()}\n--- END COMPANY TRAINING ---`
    : "";

  const schema = {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["reply", "action"] },
      text: { type: "string", description: "What Henry says to the user right now. For an immediate action, briefly acknowledge what you're doing. For a confirmation action, ask the user to confirm. For a question, give the full answer." },
      action: { type: "string", description: "The action name from the list above, or null if kind=reply" },
      params: { type: "object", description: "Extracted parameters for the action" },
      confirm: { type: "boolean", description: "true if the action is destructive/irreversible and you need the user to confirm before executing" },
    },
    required: ["kind", "text"],
  };

  const prompt = `${HENRY_SYSTEM_PROMPT}${trainingBlock}

--- CURRENT CONTEXT ---
${context || "No company context available."}
--- END CONTEXT ---

You are Henry, and you can take direct action on the company's data. Available actions:
${actionList}

DECISION RULES:
- If the employee's message asks you to DO something that maps to an action, return kind="action" with the action name and the extracted params. Set confirm=true for destructive/irreversible actions (delete, send to customer). For confirm=true, your "text" is the confirmation question to ask.
- For a non-destructive action, return kind="action", confirm=false, and your "text" is a short acknowledgment of what you're doing.
- If the message is a question, advice request, or doesn't map to an action, return kind="reply" with your full answer in "text" and action=null.
- Extract job numbers as digits only (e.g. "223" for job-223 / JOB-0223). Extract names and amounts as spoken.
- Only pick ONE action per response.

Employee says: "${userMessage}"

Respond with the JSON object only.`;

  try {
    const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, model: "automatic" });
    const data = typeof res === "object" && res?.kind ? res : res?.data;
    return data || { kind: "reply", text: "Sorry, I didn't catch that. Could you rephrase?" };
  } catch {
    return { kind: "reply", text: "Sorry, I had trouble thinking that through. Please try again." };
  }
}