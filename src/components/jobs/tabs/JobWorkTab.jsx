import JobTasksSection from "@/components/jobs/JobTasksSection";
import JobPhotosSection from "@/components/jobs/JobPhotosSection";
import JobReceiptsSection from "@/components/jobs/JobReceiptsSection";
import WorkLogSection from "@/components/jobs/WorkLogSection";
import JobInternalNotesCard from "@/components/jobs/JobInternalNotesCard";
import JobScopeOfWorkSection from "@/components/jobs/JobScopeOfWorkSection";

export default function JobWorkTab({ ctx }) {
  const { job, form, setForm, customer, techs, onSave, setJob } = ctx;

  return (
    <div className="space-y-4">
      {/* Checklist (interactive task board) */}
      <JobTasksSection
        job={job}
        techs={techs}
        onTasksUpdated={(checklist) => setJob(j => ({ ...j, checklist }))}
      />

      {/* Before & After Photos */}
      <JobPhotosSection
        job={job}
        onPhotosUpdated={(field, updated) => setJob(j => ({ ...j, [field]: updated }))}
      />

      {/* Receipts & Expenses */}
      <JobReceiptsSection
        job={job}
        onReceiptsUpdated={(receipts) => setJob(j => ({ ...j, receipts }))}
      />

      {/* Work Logs */}
      <WorkLogSection job={job} techs={techs} />

      {/* Internal notes (editable) */}
      <JobInternalNotesCard
        job={job}
        customer={customer}
        onInternalNoteAdded={(log) => setJob(j => ({ ...j, internal_notes_log: log }))}
      />

      {/* Scope of work & change orders (e-sign) */}
      <JobScopeOfWorkSection
        job={job}
        form={form}
        setForm={setForm}
        onSave={onSave}
      />
    </div>
  );
}