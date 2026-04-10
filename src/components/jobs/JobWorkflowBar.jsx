import { base44 } from "@/api/base44Client";
import { CalendarPlus, Truck, Play, CheckSquare, FileText, CreditCard } from "lucide-react";
import { format } from "date-fns";

const STEPS = [
  { key: "appointment", label: "ADD APPOINTMENT", Icon: CalendarPlus, status: "scheduled" },
  { key: "omw", label: "OMW", Icon: Truck, status: null },
  { key: "start", label: "START", Icon: Play, status: "in_progress" },
  { key: "finish", label: "FINISH", Icon: CheckSquare, status: "completed" },
  { key: "invoice", label: "INVOICE", Icon: FileText, status: null },
  { key: "pay", label: "PAY", Icon: CreditCard, status: null },
];

function isStepActive(key, job) {
  if (key === "appointment") return !!job.scheduled_start;
  if (key === "start") return job.status === "in_progress" || job.status === "completed";
  if (key === "finish") return job.status === "completed";
  return false;
}

export default function JobWorkflowBar({ job, form, onSave, onGenerateInvoice, onCollectPayment, invoiceLoading }) {
  const scheduledDate = form.scheduled_start ? format(new Date(form.scheduled_start), "EEE, MMM d") : null;
  const scheduledTime = form.scheduled_start ? format(new Date(form.scheduled_start), "h:mm a") : null;

  async function handleStep(step) {
    if (step.key === "invoice") { onGenerateInvoice(); return; }
    if (step.key === "pay") { onCollectPayment(); return; }
    if (step.status) { await onSave(step.status); }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 mb-4">
      <div className="flex items-start justify-around gap-1 overflow-x-auto">
        {STEPS.map((step, i) => {
          const { key, label, Icon } = step;
          const active = isStepActive(key, job);
          const isAppt = key === "appointment";

          return (
            <button
              key={key}
              onClick={() => handleStep(step)}
              className={`flex flex-col items-center gap-2 min-w-[70px] px-2 py-1 rounded-lg transition-colors hover:bg-slate-50 ${invoiceLoading && key === "invoice" ? "opacity-50 pointer-events-none" : ""}`}
            >
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-500 hover:border-blue-400 hover:text-blue-500"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold leading-tight ${active ? "text-blue-600" : "text-slate-500"}`}>
                  {label}
                </p>
                {isAppt && scheduledDate && (
                  <p className="text-xs text-slate-400 leading-tight">{scheduledDate}<br />{scheduledTime}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}