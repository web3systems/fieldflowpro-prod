import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { MapPin, Calendar, ChevronRight, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

// Active workflow columns only — completed / cancelled / archived are terminal
// and should NOT appear on the board (they're done). Use the List view or the
// status filter to see them.
const STATUSES = [
  { key: "new", label: "New", color: "border-l-blue-500 bg-blue-50/50", dot: "bg-blue-500" },
  { key: "estimated", label: "Estimated", color: "border-l-sky-500 bg-sky-50/50", dot: "bg-sky-500" },
  { key: "scheduled", label: "Scheduled", color: "border-l-purple-500 bg-purple-50/50", dot: "bg-purple-500" },
  { key: "in_progress", label: "In Progress", color: "border-l-amber-500 bg-amber-50/50", dot: "bg-amber-500" },
  { key: "invoiced", label: "Invoiced", color: "border-l-orange-500 bg-orange-50/50", dot: "bg-orange-500" },
  { key: "on_hold", label: "On Hold", color: "border-l-gray-500 bg-gray-50/50", dot: "bg-gray-500" },
];

const TERMINAL_STATUSES = ["completed", "cancelled", "archived"];

const PRIORITY_BADGE = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function JobKanbanBoard({ jobs, customers, techs, onStatusChange, filterStatus, search }) {
  const navigate = useNavigate();

  const getCustomerName = (id) => {
    const c = customers.find(c => c.id === id);
    return c ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.business_name || "—" : "—";
  };

  const getTechName = (techIds) => {
    if (!techIds?.length) return null;
    const t = techs.find(x => x.id === techIds[0]);
    return t ? `${t.first_name} ${t.last_name}` : null;
  };

  // Only active (non-terminal) jobs appear on the board
  let filtered = jobs.filter(j => {
    const q = (search || "").toLowerCase();
    const custName = getCustomerName(j.customer_id).toLowerCase();
    const matchSearch = !search || j.title?.toLowerCase().includes(q) || custName.includes(q);
    const matchStatus = !filterStatus || filterStatus === "all" || j.status === filterStatus;
    const isActive = !TERMINAL_STATUSES.includes(j.status);
    return matchSearch && matchStatus && isActive;
  });

  // Group by status (only active columns)
  const columns = STATUSES.map(s => ({
    ...s,
    jobs: filtered.filter(j => j.status === s.key),
  }));

  // If filtering by a specific active status, only show that column
  const visibleColumns = filterStatus && filterStatus !== "all" && !TERMINAL_STATUSES.includes(filterStatus)
    ? columns.filter(c => c.key === filterStatus)
    : columns;

  function handleDragEnd(result) {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId;
    const job = jobs.find(j => j.id === draggableId);
    if (!job || job.status === newStatus) return;

    onStatusChange(draggableId, newStatus);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="w-full overflow-x-auto pb-4 -mx-1 px-1">
        <div className="flex gap-4 min-w-max">
          {visibleColumns.map(column => (
            <div
              key={column.key}
              className="flex-shrink-0 w-[78vw] sm:w-72 snap-start flex flex-col"
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${column.dot}`} />
                  <span className="text-sm font-semibold text-slate-700">{column.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{column.jobs.length}</Badge>
              </div>

              <Droppable droppableId={column.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-2 p-1 rounded-lg min-h-[120px] max-h-[60vh] overflow-y-auto transition-colors ${
                      snapshot.isDraggingOver ? "bg-slate-100" : ""
                    }`}
                  >
                    {column.jobs.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                        No jobs
                      </div>
                    )}
                    {column.jobs.map((job, index) => (
                      <Draggable key={job.id} draggableId={job.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => navigate(`/JobDetail/${job.id}`)}
                            className={`bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                              snapshot.isDragging ? "shadow-xl rotate-1" : ""
                            } ${column.color} border-l-4`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <h4 className="text-sm font-semibold text-slate-900 leading-tight line-clamp-1">
                                  {getCustomerName(job.customer_id)}
                                </h4>
                                {job.priority === "urgent" && (
                                  <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_BADGE.urgent}`}>!</Badge>
                                )}
                              </div>
                              {job.title && (
                                <p className="text-xs text-slate-500 mb-2 line-clamp-1">{job.title}</p>
                              )}
                              <div className="space-y-1 text-[11px] text-slate-500">
                                {job.scheduled_start && !isNaN(new Date(job.scheduled_start)) && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {format(new Date(job.scheduled_start), "M/d h:mm a")}
                                  </div>
                                )}
                                {job.address && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span className="line-clamp-1">{job.address}</span>
                                  </div>
                                )}
                                {getTechName(job.assigned_techs) && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {getTechName(job.assigned_techs)}
                                  </div>
                                )}
                              </div>
                              {job.total_amount > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-700">
                                    ${job.total_amount.toLocaleString()}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                </div>
                              )}
                            </CardContent>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}