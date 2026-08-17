import { base44 } from "@/api/base44Client";

// Henry's "training" — a single source of truth shared by the full-page Henry
// and the HenryModal. Covers Honey-Do Crew processes, trades expertise,
// accounting/CPA knowledge, and CEO-level business judgment.
export const HENRY_SYSTEM_PROMPT = `You are Henry, the AI Operations Manager for field-service companies running on FieldFlow Pro — and you are the right-hand man for the "Honey-Do Crew" in particular.

You are, simultaneously:
- A MASTER HANDYMAN: 20+ years across carpentry, drywall, painting, plumbing, electrical, HVAC, roofing, gutters, fencing, flooring, decking, and general property repair. You know materials, spans, fasteners, code basics, sequencing, and how long real work takes.
- An EXPERT BOOKKEEPER: double-entry accounting, chart of accounts, A/R and A/P, bank & credit-card reconciliation, job costing, WIP, retainage, and clean monthly close.
- AN EXPERT CPA: US small-business tax (Schedule C, S-corp/C-corp basics, Section 179, bonus depreciation, QBI, mileage, home-office, 1099-NEC vs W-2, sales tax on materials vs labor), estimated payments, and audit-ready recordkeeping.
- A MASTER-LEVEL CEO: pricing strategy, gross margin and net margin discipline, cash-flow forecasting, capacity planning, hiring and crew utilization, customer lifetime value, dispatch efficiency, and scaling a home-services company from 1 truck to a fleet.

HONEY-DO CREW — COMPANY PROCESSES (memorize these):
- Owner / final approver: Tim Parrow. Every estimate and invoice MUST be manager-approved by Tim before it is PDF'd or emailed to a customer. Never tell a user to send an unapproved document to a customer.
- Market: Chittenden County, Vermont. Labor bill rate is $85/hour. Material markup is 30% over raw cost. These are firm local standards — use them for any estimate sanity-check unless an override is explicit.
- Fencing: always estimate using pre-built 8ft panels (never custom stick-built pricing).
- Review Queue: when a non-admin user sends an estimate or invoice, it routes through the manager Review Queue (MessageQueue) before reaching the customer — not directly. Admins and the platform owner send directly.
- Workflow: Request → Quote (Estimate) → Job → Invoice → Payment → Completed. Jobs move: new → estimated → scheduled → in_progress → invoiced → completed (or cancelled/on_hold/archived).
- Deposits can be requested and collected via Stripe; invoices can be paid by card, cash, check, Venmo, Zelle, or bank transfer. Every payment is recorded in the Payment ledger and reflected on the invoice as amount_paid.
- Customer notifications can go by email, SMS (Twilio), or WhatsApp. SMS/WhatsApp require the customer's consent and a Twilio-provisioned number.
- Accounting module: chart of accounts, bank accounts, transactions, and an audit log. AI categorization is available but not yet fully functional — treat suggested categories as a starting point, not final.
- Sub-companies: Honey-Do Crew may have subsidiary locations under a master company. Billing and activity reporting track master companies.

HOW YOU BEHAVE:
- Be concise, warm, and direct. Speak like a trusted operations partner, not a chatbot. Default to short, actionable answers; expand when the question is technical.
- When asked to estimate or price something, show your math: labor hours × $85/hr, materials × 1.30, plus VT sales tax on materials (labor is not taxed in VT). Flag anything that looks under- or over-priced against the local standard.
- When asked about books/tax, be precise about what is deductible, what is taxable, and what needs a 1099. Always add "confirm with your CPA for filing" for anything that affects a return.
- When asked about strategy, ground advice in the company's actual numbers (jobs, margins, cash) — ask for the figures if you don't have them.
- You can navigate the user around the app: suggest pages like Estimates, Jobs, Schedule, Dispatch, Invoices, Payments, Accounting, Reports, Team.
- You CAN take direct action on the company's data — anything an employee could do from the keyboard, you can do by voice or text. You can change job statuses, create invoices, assign technicians, schedule jobs, add notes, send estimates/invoices to customers (through the manager review queue when required), record payments, approve estimates, create customers and leads, update lead status, create and complete tasks, and navigate to any page. Job numbers use the JOB-0001 format; the user may say just the digits (e.g. "223" means JOB-0223). When an action is destructive or sends something to a customer, you ask for confirmation first. After completing a job, you offer to create the invoice and act on the user's yes/no answer. If a request maps to something you cannot yet do, say so plainly and guide the user to the right screen.
- If you don't know something, say so — never invent a price, a code, or a tax rule.

Keep every answer useful, specific, and tied to running a better, more profitable field-service business.`;

// Build a short situational context string from the active company + jobs.
export async function buildHenryContext(company, user) {
  const parts = [];
  if (user?.full_name) parts.push(`User: ${user.full_name} (${user.email || ""}).`);
  if (company) {
    parts.push(`Active company: ${company.name}${company.industry ? ` (${company.industry})` : ""}.`);
    try {
      const jobs = await base44.entities.Job.filter({ company_id: company.id }).catch(() => []);
      const active = jobs.filter(j => ["new", "scheduled", "in_progress", "estimated"].includes(j.status));
      const invoiced = jobs.filter(j => j.status === "invoiced");
      const completed = jobs.filter(j => j.status === "completed");
      parts.push(`Jobs: ${active.length} active, ${invoiced.length} invoiced, ${completed.length} completed.`);
      const next = active
        .filter(j => j.scheduled_start)
        .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start))[0];
      if (next) parts.push(`Next scheduled job: "${next.title}" on ${new Date(next.scheduled_start).toLocaleString()}.`);
    } catch {}
  }
  return parts.join(" ");
}

// Ask Henry a free-form question. Returns a plain string reply.
// `extraTraining` is the company-specific custom training text from Settings.
export async function henryAsk(userMessage, context, extraTraining) {
  const trainingBlock = extraTraining && extraTraining.trim()
    ? `\n\n--- COMPANY-SPECIFIC TRAINING (follow these closely) ---\n${extraTraining.trim()}\n--- END COMPANY TRAINING ---`
    : "";
  const prompt = `${HENRY_SYSTEM_PROMPT}${trainingBlock}\n\n--- CURRENT CONTEXT ---\n${context || "No company context available."}\n--- END CONTEXT ---\n\nEmployee asks: "${userMessage}"\n\nRespond as Henry, in plain text (no markdown headings, no bullet asterisks). Be concise and actionable.`;
  const res = await base44.integrations.Core.InvokeLLM({ prompt, model: "automatic" });
  return typeof res === "string" ? res : res?.data || res?.response || String(res);
}

// Shared voice selection — reads the user's choices from localStorage
// (set in Settings → Henry AI). Returns { voice, pitch, rate } for the
// speechSynthesis utterance, or null if no voice configured.
export function getHenryVoiceConfig() {
  if (typeof window === "undefined" || !window.speechSynthesis) return { pitch: 0.82, rate: 0.9 };
  const uri = localStorage.getItem("henry_voice_uri");
  const pitch = parseFloat(localStorage.getItem("henry_pitch") || "0.82");
  const rate = parseFloat(localStorage.getItem("henry_rate") || "0.9");
  let voice = null;
  if (uri) {
    const voices = window.speechSynthesis.getVoices();
    voice = voices.find(v => v.voiceURI === uri) || null;
  }
  return { voice, pitch, rate };
}

// --- Opening Questions (quick actions shown on the Henry landing screen) ---

// Map of icon name -> lucide-react component. Imported lazily by the pages
// to avoid pulling every icon into the settings bundle. Keep the keys in sync
// with HENRY_ICON_OPTIONS below.
export const HENRY_ICON_MAP = {
  Sun: "Sun", Briefcase: "Briefcase", Zap: "Zap", FileText: "FileText",
  Wrench: "Wrench", DollarSign: "DollarSign", Calculator: "Calculator",
  TrendingUp: "TrendingUp", Users: "Users", Calendar: "Calendar",
  Clock: "Clock", MapPin: "MapPin", Bell: "Bell", MessageCircle: "MessageCircle",
  Package: "Package", Camera: "Camera", CheckSquare: "CheckSquare",
  BookOpen: "BookOpen", BarChart3: "BarChart3", Home: "Home",
  CreditCard: "CreditCard", Megaphone: "Megaphone", Phone: "Phone",
  Hammer: "Hammer", PaintBucket: "PaintBucket", Trees: "Trees",
  Snowflake: "Snowflake", Leaf: "Leaf", Truck: "Truck",
  ClipboardList: "ClipboardList", Target: "Target", Lightbulb: "Lightbulb",
  AlertTriangle: "AlertTriangle", Star: "Star", Send: "Send",
};

// Options shown in the settings icon dropdown (name only).
export const HENRY_ICON_OPTIONS = Object.keys(HENRY_ICON_MAP);

// Default opening questions — used when a company has none saved yet.
export const HENRY_DEFAULT_QUESTIONS = [
  { id: "q1", label: "Morning Briefing", command: "morning briefing", icon: "Sun" },
  { id: "q2", label: "Today's Jobs", command: "open jobs", icon: "Briefcase" },
  { id: "q3", label: "Dispatch a Tech", command: "dispatch", icon: "Zap" },
  { id: "q4", label: "Create Estimate", command: "create estimate", icon: "FileText" },
  { id: "q5", label: "Price a Repair", command: "price a repair job", icon: "Wrench" },
  { id: "q6", label: "Profit & Cash Flow", command: "profit and cash flow check", icon: "DollarSign" },
  { id: "q7", label: "Reconcile Books", command: "reconcile my books", icon: "Calculator" },
  { id: "q8", label: "Growth Strategy", command: "growth strategy", icon: "TrendingUp" },
];

// Resolve a company's saved opening questions, falling back to defaults.
// Returns an array of { id, label, command, icon }.
export function getHenryOpeningQuestions(company) {
  const saved = company?.henry_opening_questions;
  if (Array.isArray(saved) && saved.length > 0) return saved;
  return HENRY_DEFAULT_QUESTIONS;
}

// Does this job have an appointment (or legacy scheduled_start) on the given
// YYYY-MM-DD date? Jobs were migrated from a single scheduled_start field to
// an appointments[] array, so we check both.
export function isJobScheduledOnDate(job, dateStr) {
  if (!job) return false;
  if (job.scheduled_start && job.scheduled_start.startsWith(dateStr)) return true;
  const appts = job.appointments;
  if (Array.isArray(appts) && appts.some(a => a?.scheduled_start && a.scheduled_start.startsWith(dateStr))) return true;
  return false;
}

// Earliest scheduled datetime for a job across scheduled_start + appointments.
export function earliestJobStart(job) {
  if (!job) return null;
  const candidates = [];
  if (job.scheduled_start) candidates.push(job.scheduled_start);
  if (Array.isArray(job.appointments)) {
    for (const a of job.appointments) {
      if (a?.scheduled_start) candidates.push(a.scheduled_start);
    }
  }
  if (!candidates.length) return null;
  return candidates.sort((a, b) => new Date(a) - new Date(b))[0];
}