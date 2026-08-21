import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ExternalLink, MapPin, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JobWorkflowBar from "@/components/jobs/JobWorkflowBar";
import JobCustomerNotesCard from "@/components/jobs/JobCustomerNotesCard";
import JobActivityFeed from "@/components/jobs/JobActivityFeed";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "on_hold", label: "On Hold" },
];

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  scheduled: "bg-purple-100 text-purple-700 border-purple-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  on_hold: "bg-gray-100 text-gray-700 border-gray-200",
};

const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export default function JobOverviewTab({ ctx }) {
  const { job, form, setForm, customer, techs, onSave, setJob, navigate } = ctx;
  const fullAddress = [form.address, form.city, form.state, form.zip].filter(Boolean).join(", ");
  const assignedTechObjects = (form.assigned_techs || []).map(id => techs.find(t => t.id === id)).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Mobile customer info */}
      <div className="lg:hidden bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-800 text-sm">{customer ? (customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim()) : "No customer"}</p>
          {customer && <Link to={`/CustomerDetail/${customer.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">Profile <ExternalLink className="w-3 h-3" /></Link>}
        </div>
        {customer?.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Phone className="w-3 h-3" />{customer.phone}</a>}
        {customer?.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Mail className="w-3 h-3" />{customer.email}</a>}
        {customer?.address && <p className="text-xs text-slate-600 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />{customer.address}{customer.city ? `, ${customer.city}` : ""}{customer.state ? `, ${customer.state}` : ""} {customer.zip || ""}</p>}
        {form.scheduled_start && <p className="text-xs text-slate-400">Scheduled: {format(new Date(form.scheduled_start), "MMM d, yyyy · h:mm a")}</p>}
        {form.total_amount > 0 && <p className="text-sm font-semibold text-slate-900">${form.total_amount.toLocaleString()}</p>}
      </div>

      {/* Workflow Pipeline */}
      <JobWorkflowBar
        job={job}
        form={form}
        onSave={onSave}
        onGenerateInvoice={ctx.generateInvoice}
        onCollectPayment={ctx.collectPayment}
        invoiceLoading={ctx.invoiceActionLoading}
      />

      {/* Summary card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs border ${STATUS_COLORS[form.status] || "bg-gray-100 text-gray-600"}`}>
              {form.status?.replace("_", " ")}
            </Badge>
            <Badge className={`text-xs ${PRIORITY_COLORS[form.priority] || "bg-gray-100 text-gray-600"}`}>
              {form.priority}
            </Badge>
            {form.job_number && <span className="text-xs text-slate-400 font-medium">{form.job_number}</span>}
          </div>
          {/* Quick status update */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Update status:</span>
            <Select value={form.status} onValueChange={(s) => onSave(s)}>
              <SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900">{form.title}</h2>
          {form.description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{form.description}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Service Type</p>
            <p className="text-sm text-slate-800">{form.service_type || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Customer</p>
            {customer ? (
              <Link to={`/CustomerDetail/${customer.id}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                {customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim()} <ExternalLink className="w-3 h-3" />
              </Link>
            ) : <p className="text-sm text-slate-400">No customer</p>}
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Address</p>
            <p className="text-sm text-slate-800 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />{fullAddress || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Assigned Techs</p>
            {assignedTechObjects.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {assignedTechObjects.map(t => (
                  <span key={t.id} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{t.first_name} {t.last_name}</span>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Unassigned</p>}
          </div>
        </div>
      </div>

      {/* Customer notes */}
      <JobCustomerNotesCard
        job={job}
        customer={customer}
        onCustomerNoteAdded={(notes) => setJob(j => ({ ...j, customer_notes: notes }))}
      />

      {/* Activity feed */}
      <JobActivityFeed job={job} form={form} customer={customer} techs={techs} />
    </div>
  );
}