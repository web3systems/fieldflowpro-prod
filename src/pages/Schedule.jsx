import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, ChevronLeft, ChevronRight, Bell, MapPin, Clock, User, History, CalendarDays, X, CheckCircle2, Clock4, Users2, CheckSquare, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const localizer = momentLocalizer(moment);

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "#3b82f6" },
  { value: "scheduled", label: "Scheduled", color: "#8b5cf6" },
  { value: "in_progress", label: "In Progress", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "#10b981" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
  { value: "on_hold", label: "On Hold", color: "#6b7280" },
];

const APPOINTMENT_STATUS_COLORS = {
  upcoming: "#3b82f6",
  in_progress: "#f59e0b",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const defaultJob = {
  title: "", description: "", status: "scheduled", priority: "medium",
  address: "", scheduled_start: "", scheduled_end: "",
  customer_id: "", service_type: "", notes: "", assigned_techs: []
};

function convertTimeTo24(time12h) {
  if (!time12h) return "09:00";
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${String(hours).padStart(2, '0')}:${minutes || '00'}`;
}

// Custom event renderer — jobs are colored blocks
function CalendarEvent({ event }) {
  return (
    <div className="px-1 text-[11px] leading-tight text-white font-medium truncate">
      {event.title}
    </div>
  );
}

// Custom date cell wrapper — renders tasks pinned at the bottom of each day cell
function DateCellWrapper({ children, value, tasksByDate, onTaskClick }) {
  const dateKey = moment(value).format("YYYY-MM-DD");
  const dayTasks = tasksByDate[dateKey] || [];
  if (dayTasks.length === 0) return children;

  return (
    <div className="rbc-date-cell-wrapper flex flex-col h-full">
      <div className="flex-1 min-h-0">{children}</div>
      <div className="flex-shrink-0 border-t border-slate-100 mx-0.5 pt-0.5 pb-1">
        {dayTasks.map(task => (
          <button
            key={task.id}
            onClick={(e) => { e.stopPropagation(); onTaskClick(); }}
            className="block w-full text-left px-1 text-[9px] leading-tight text-slate-500 hover:text-blue-600 truncate"
            title={task.title}
          >
            <CheckSquare className="w-2 h-2 inline-block mr-0.5 text-slate-400 flex-shrink-0" />
            {task.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Schedule() {
  const { activeCompany } = useApp();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [techs, setTechs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [eventOpen, setEventOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventForm, setEventForm] = useState({
    type: "estimate",
    title: "",
    customer_id: "",
    date: moment().format("YYYY-MM-DD"),
    startTime: "08:00",
    endTime: "17:00",
    priority: "medium",
    notes: "",
  });
  const [filterTech, setFilterTech] = useState("all");
  const [historyMode, setHistoryMode] = useState(false);
  const [historyRange, setHistoryRange] = useState({
    from: moment().subtract(1, 'month').format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
  });
  const [calendarType, setCalendarType] = useState("customers"); // "customers" | "tasks"
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    const [j, c, t, b, tk] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
      base44.entities.ServiceBooking.filter({ company_id: activeCompany.id, status: "pending" }),
      base44.entities.Task.filter({ company_id: activeCompany.id }),
    ]);
    setJobs(j);
    setCustomers(c);
    setTechs(t);
    setBookings(b);
    setTasks(tk);
  }

  const filteredJobs = useMemo(() => {
    if (filterTech === "all") return jobs;
    return jobs.filter(j =>
      j.assigned_techs?.includes(filterTech) ||
      (j.appointments || []).some(a => (a.assigned_techs || []).includes(filterTech))
    );
  }, [jobs, filterTech]);

  const CALENDAR_JOB_STATUSES = new Set(["scheduled", "in_progress", "completed"]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (!task.due_date) return;
      if (!map[task.due_date]) map[task.due_date] = [];
      map[task.due_date].push(task);
    });
    return map;
  }, [tasks]);

  const TASK_PRIORITY_COLORS = {
    urgent: "#ef4444",
    high: "#f59e0b",
    medium: "#3b82f6",
    low: "#6b7280",
  };

  const TASK_PRIORITY_BG = {
    urgent: "#fef2f2",
    high: "#fffbeb",
    medium: "#eff6ff",
    low: "#f9fafb",
  };

  // Task calendar events
  const taskEvents = useMemo(() => {
    return tasks
      .filter(t => t.due_date && t.status !== "cancelled" && t.status !== "completed")
      .map(t => ({
        id: t.id,
        title: t.title,
        start: new Date(t.due_date + "T00:00:00"),
        end: new Date(t.due_date + "T23:59:59"),
        resource: t,
        isTask: true,
      }));
  }, [tasks]);

  const taskEventStyleGetter = (event) => {
    const priority = event.resource?.priority || "medium";
    const color = TASK_PRIORITY_COLORS[priority] || "#3b82f6";
    return {
      style: {
        backgroundColor: color,
        borderRadius: "4px",
        color: "white",
        padding: "2px 5px",
        fontSize: "11px",
        fontWeight: "500",
        borderLeft: `3px solid ${color}`,
      },
    };
  };

  const events = useMemo(() => {
    const result = [];

    filteredJobs.forEach(j => {
      const cust = customers.find(c => c.id === j.customer_id);
      const customerName = cust ? `${cust.first_name} ${cust.last_name}` : "";

      const hasAppointments = (j.appointments || []).length > 0;

      // Legacy scheduled_start: only show if no appointments and status is calendar-eligible
      if (!hasAppointments && j.scheduled_start && CALENDAR_JOB_STATUSES.has(j.status)) {
        result.push({
          id: j.id,
          title: customerName ? `${j.title} · ${customerName}` : j.title,
          start: new Date(j.scheduled_start),
          end: j.scheduled_end
            ? new Date(j.scheduled_end)
            : new Date(new Date(j.scheduled_start).getTime() + 60 * 60 * 1000),
          resource: j,
          isAppointment: false,
        });
      }

      // Individual appointments from the appointments array — show regardless of job status
      (j.appointments || []).forEach((apt, idx) => {
        if (!apt.scheduled_start || apt.status === "cancelled") return;
        const aptLabel = `${customerName || j.title}${j.appointments?.length > 1 ? ` · Visit ${idx + 1}` : ""}`;
        result.push({
          id: `${j.id}_apt_${apt.id || idx}`,
          title: aptLabel,
          start: new Date(apt.scheduled_start),
          end: apt.scheduled_end
            ? new Date(apt.scheduled_end)
            : new Date(new Date(apt.scheduled_start).getTime() + 60 * 60 * 1000),
          resource: j,
          aptStatus: apt.status,
          isAppointment: true,
        });
      });
    });

    return result;
  }, [filteredJobs, customers]);

  // Filter events by history range when history mode is active
  const displayEvents = useMemo(() => {
    if (!historyMode) return events;
    const from = moment(historyRange.from).startOf('day');
    const to = moment(historyRange.to).endOf('day');
    return events.filter(ev => {
      const evDate = moment(ev.start);
      return evDate.isBetween(from, to, 'day', '[]');
    });
  }, [events, historyMode, historyRange]);

  // Summary stats for the historical period
  const historyStats = useMemo(() => {
    if (!historyMode) return null;
    const filtered = displayEvents;
    const uniqueJobs = new Set(filtered.map(e => e.resource?.id).filter(Boolean));
    const totalEvents = filtered.length;
    const completedEvents = filtered.filter(e =>
      e.isAppointment ? e.aptStatus === 'completed' : e.resource?.status === 'completed'
    ).length;
    return { totalEvents, completedEvents, uniqueJobs: uniqueJobs.size };
  }, [displayEvents, historyMode]);

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6';
    if (event.isAppointment && event.aptStatus) {
      backgroundColor = APPOINTMENT_STATUS_COLORS[event.aptStatus] || '#3b82f6';
    } else {
      const statusOption = STATUS_OPTIONS.find(s => s.value === event.resource?.status);
      backgroundColor = statusOption?.color || '#3b82f6';
    }
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        color: 'white',
        border: event.isAppointment ? '1px dashed rgba(255,255,255,0.4)' : 'none',
        padding: '2px 5px',
        fontSize: '12px',
        fontWeight: '500',
      }
    };
  };

  function handleSelectEvent(event) {
    if (event.isTask) {
      navigate(createPageUrl("Tasks"));
      return;
    }
    const job = event.resource;
    navigate(`/JobDetail/${job.id}`);
  }

  function handleTaskClick() {
    navigate(createPageUrl("Tasks"));
  }

  function openEventModal(presetDate) {
    setEventForm({
      type: calendarType === "tasks" ? "task" : "estimate",
      title: "",
      customer_id: "",
      date: presetDate || moment().format("YYYY-MM-DD"),
      startTime: "08:00",
      endTime: "17:00",
      priority: "medium",
      notes: "",
    });
    setEventOpen(true);
  }

  function handleSelectSlot(slot) {
    openEventModal(moment(slot.start).format("YYYY-MM-DD"));
  }

  async function handleEventSave() {
    // New Estimate / New Job both go to estimate creation (jobs require estimates first)
    if (eventForm.type === "estimate" || eventForm.type === "job") {
      const params = new URLSearchParams();
      if (eventForm.date) params.set("date", eventForm.date);
      if (eventForm.customer_id) params.set("customer_id", eventForm.customer_id);
      const qs = params.toString();
      navigate(`/NewEstimate${qs ? "?" + qs : ""}`);
      setEventOpen(false);
      return;
    }

    // Company Task / Project — create a task
    if (!eventForm.title || !eventForm.date) return;
    setSaving(true);
    try {
      await base44.entities.Task.create({
        company_id: activeCompany.id,
        title: eventForm.title,
        due_date: eventForm.date,
        priority: eventForm.priority || "medium",
        status: "todo",
        notes: eventForm.notes || "",
      });
      setEventOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }


async function convertBookingToJob(booking) {
    let customer = customers.find(c => c.email === booking.email);
    if (!customer && booking.email) {
      customer = await base44.entities.Customer.create({
        company_id: activeCompany.id,
        first_name: booking.first_name,
        last_name: booking.last_name,
        email: booking.email,
        phone: booking.phone,
        address: booking.address,
        status: "active",
        source: "website",
      });
    }
    const scheduledStart = booking.preferred_date
      ? `${booking.preferred_date}T${convertTimeTo24(booking.preferred_time)}`
      : "";
    // Generate sequential job number per company
    const companyJobs = await base44.entities.Job.filter({ company_id: activeCompany.id });
    const maxNum = companyJobs.reduce((max, j) => {
      const m = j.job_number?.match(/JOB-(\d+)/);
      return m ? Math.max(max, parseInt(m[1])) : max;
    }, 0);
    const job_number = `JOB-${String(maxNum + 1).padStart(4, '0')}`;
    await base44.entities.Job.create({
      company_id: activeCompany.id,
      customer_id: customer?.id || booking.customer_id || "",
      title: booking.service_type || "Service Request",
      job_number,
      description: booking.notes || "",
      status: "scheduled",
      address: booking.address || "",
      scheduled_start: scheduledStart,
    });
    await base44.entities.ServiceBooking.update(booking.id, { status: "converted" });
    await loadData();
  }

  async function declineBooking(booking) {
    await base44.entities.ServiceBooking.update(booking.id, { status: "cancelled" });
    await loadData();
  }


  const navigateCalendar = (direction) => {
    const unit = view === Views.MONTH ? 'month' : view === Views.WEEK ? 'week' : 'day';
    setDate(d => moment(d).add(direction, unit).toDate());
  };

  const dateLabel = () => {
    if (view === Views.MONTH) return moment(date).format("MMMM YYYY");
    if (view === Views.WEEK) return `${moment(date).startOf('week').format("MMM D")} – ${moment(date).endOf('week').format("MMM D, YYYY")}`;
    return moment(date).format("MMMM D, YYYY");
  };

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(var(--app-vh) - 57px)' }}>
      {/* Pending bookings sidebar — only in customer calendar */}
      {calendarType === "customers" && bookings.length > 0 && (
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Pending Bookings</h2>
              <Badge className="bg-amber-100 text-amber-700 text-xs ml-auto">{bookings.length}</Badge>
            </div>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            {bookings.map(booking => (
              <Card key={booking.id} className="border-amber-200 bg-amber-50">
                <CardContent className="p-3 space-y-1">
                  <p className="font-semibold text-slate-800 text-sm">{booking.first_name} {booking.last_name}</p>
                  <p className="text-xs font-medium text-slate-700">{booking.service_type}</p>
                  {booking.preferred_date && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{booking.preferred_date} · {booking.preferred_time}
                    </p>
                  )}
                  {booking.address && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{booking.address}
                    </p>
                  )}
                  {booking.notes && <p className="text-xs text-slate-400 italic line-clamp-2">{booking.notes}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => convertBookingToJob(booking)} className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700">Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => declineBooking(booking)} className="flex-1 h-7 text-xs text-red-600 border-red-200 hover:bg-red-50">Decline</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main calendar */}
      <div className="flex-1 flex flex-col min-w-0 p-4 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => { setDate(new Date()); setHistoryMode(false); }}>Today</Button>
            {!historyMode ? (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateCalendar(-1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateCalendar(1)}><ChevronRight className="w-4 h-4" /></Button>
                <h2 className="text-base font-semibold text-slate-800">{dateLabel()}</h2>

                {/* Calendar Switcher Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setCalendarDropdownOpen(!calendarDropdownOpen)}
                    className="flex items-center gap-1 ml-2 px-2 py-1 text-lg font-bold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {calendarType === "customers" ? "Customer Schedule" : "Company Tasks / Projects"}
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${calendarDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {calendarDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setCalendarDropdownOpen(false)} />
                      <div className="absolute left-0 top-full mt-1 z-20 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => { setCalendarType("customers"); setCalendarDropdownOpen(false); setHistoryMode(false); setDate(new Date()); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 ${calendarType === "customers" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
                        >
                          <CalendarDays className="w-4 h-4" />
                          Customer Schedule
                        </button>
                        <button
                          onClick={() => { setCalendarType("tasks"); setCalendarDropdownOpen(false); setHistoryMode(false); setDate(new Date()); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 ${calendarType === "tasks" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
                        >
                          <CheckSquare className="w-4 h-4" />
                          Company Tasks / Projects
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="h-6 w-px bg-slate-200 mx-1" />
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">History</span>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={historyRange.from}
                    onChange={e => {
                      const from = e.target.value;
                      setHistoryRange(r => ({ ...r, from }));
                      if (from) setDate(new Date(from + "T00:00:00"));
                    }}
                    className="h-8 w-36 text-xs bg-white"
                  />
                  <span className="text-xs text-slate-400">–</span>
                  <Input
                    type="date"
                    value={historyRange.to}
                    onChange={e => setHistoryRange(r => ({ ...r, to: e.target.value }))}
                    className="h-8 w-36 text-xs bg-white"
                  />
                  {historyRange.from !== moment().subtract(1, 'month').format("YYYY-MM-DD") ||
                   historyRange.to !== moment().format("YYYY-MM-DD") ? (
                    <button
                      onClick={() => setHistoryRange({ from: moment().subtract(1, 'month').format("YYYY-MM-DD"), to: moment().format("YYYY-MM-DD") })}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* History / Live toggle — only in customer calendar */}
            {calendarType === "customers" && (
              <>
                <Button
                  variant={historyMode ? "default" : "outline"}
                  size="sm"
                  className={`h-8 gap-1.5 text-xs ${historyMode ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                  onClick={() => {
                    const nextMode = !historyMode;
                    setHistoryMode(nextMode);
                    if (nextMode) {
                      setDate(new Date(historyRange.from + "T00:00:00"));
                      setView(Views.MONTH);
                    } else {
                      setDate(new Date());
                    }
                  }}
                >
                  <History className="w-3.5 h-3.5" />
                  {historyMode ? "Live" : "History"}
                </Button>
                {historyMode && (
                  <Select
                    value=""
                    onValueChange={(v) => {
                      if (!v) return;
                      const now = moment();
                      let from, to;
                      if (v === "last_week") { from = now.clone().subtract(1, 'week').startOf('week'); to = now.clone().subtract(1, 'week').endOf('week'); }
                      else if (v === "last_month") { from = now.clone().subtract(1, 'month').startOf('month'); to = now.clone().subtract(1, 'month').endOf('month'); }
                      else if (v === "last_30") { from = now.clone().subtract(30, 'days'); to = now; }
                      else if (v === "last_quarter") { from = now.clone().subtract(3, 'months').startOf('month'); to = now.clone().subtract(1, 'month').endOf('month'); }
                      else if (v === "this_month") { from = now.clone().startOf('month'); to = now; }
                      setHistoryRange({ from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") });
                        setDate(from.toDate());
                    }}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <Clock4 className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Quick range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_week">Last Week</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="last_30">Last 30 Days</SelectItem>
                      <SelectItem value="last_quarter">Last Quarter</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {techs.length > 0 && (
                  <Select value={filterTech} onValueChange={setFilterTech}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <User className="w-3 h-3 mr-1 flex-shrink-0" />
                      <SelectValue placeholder="All Techs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Technicians</SelectItem>
                      {techs.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs">
              {[Views.MONTH, Views.WEEK, Views.DAY].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 font-medium capitalize transition-colors ${view === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 h-8" onClick={() => openEventModal()}>
              <Plus className="w-3.5 h-3.5" /> Add Event
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap mb-2 flex-shrink-0">
          {calendarType === "customers" ? (
            <>
              {STATUS_OPTIONS.filter(s => CALENDAR_JOB_STATUSES.has(s.value)).map(s => (
                <span key={s.value} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}

            </>
          ) : (
            <>
              {Object.entries(TASK_PRIORITY_COLORS).map(([priority, color]) => (
                <span key={priority} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </span>
              ))}
            </>
          )}
        </div>

        {/* History stats bar — only in customer calendar */}
        {calendarType === "customers" && historyMode && historyStats && (
          <div className="flex items-center gap-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-2 flex-shrink-0 text-xs">
            <div className="flex items-center gap-1.5 text-amber-800">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="font-medium">{historyStats.totalEvents}</span> appointments
            </div>
            <div className="w-px h-4 bg-amber-200" />
            <div className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-medium">{historyStats.completedEvents}</span> completed
            </div>
            <div className="w-px h-4 bg-amber-200" />
            <div className="flex items-center gap-1.5 text-amber-700">
              <Users2 className="w-3.5 h-3.5" />
              <span className="font-medium">{historyStats.uniqueJobs}</span> unique jobs
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="flex-1 min-h-0">
          <Calendar
            localizer={localizer}
            events={calendarType === "customers" ? displayEvents : taskEvents}
            view={view}
            date={date}
            onNavigate={setDate}
            onView={setView}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={calendarType === "customers" ? eventStyleGetter : taskEventStyleGetter}
            components={calendarType === "customers" ? {
              event: CalendarEvent,
            } : {
              event: CalendarEvent,
            }}
            toolbar={false}
            style={{ height: '100%' }}
          />
        </div>
      </div>

      {/* Add Event Modal */}
      {eventOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">Add Event</h2>
              <button onClick={() => setEventOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={eventForm.type} onValueChange={v => setEventForm({ ...eventForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estimate">New Estimate</SelectItem>
                    <SelectItem value="job">New Job</SelectItem>
                    <SelectItem value="task">Company Task / Project</SelectItem>
                  </SelectContent>
                </Select>
                {(eventForm.type === "estimate" || eventForm.type === "job") && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    Jobs start with an estimate — you'll be taken to the estimate creation page{(eventForm.type === "job") ? " (the job is created automatically when the estimate is approved)" : ""}.
                  </p>
                )}
              </div>

              {/* Title — only for tasks (estimates/jobs get their title on the estimate page) */}
              {eventForm.type === "task" && (
                <div>
                  <Label>Title *</Label>
                  <Input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Task title" />
                </div>
              )}

              {/* Customer — for estimates/jobs */}
              {(eventForm.type === "estimate" || eventForm.type === "job") && (
                <div>
                  <Label>Customer (optional)</Label>
                  <Select value={eventForm.customer_id} onValueChange={v => setEventForm({ ...eventForm, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select customer (optional)" /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} />
                </div>
                {eventForm.type === "task" ? (
                  <div>
                    <Label>Priority</Label>
                    <Select value={eventForm.priority} onValueChange={v => setEventForm({ ...eventForm, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>Time</Label>
                    <div className="flex gap-2">
                      <Input type="time" value={eventForm.startTime} onChange={e => setEventForm({ ...eventForm, startTime: e.target.value })} />
                      <Input type="time" value={eventForm.endTime} onChange={e => setEventForm({ ...eventForm, endTime: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes — only for tasks */}
              {eventForm.type === "task" && (
                <div>
                  <Label>Notes</Label>
                  <Textarea value={eventForm.notes} onChange={e => setEventForm({ ...eventForm, notes: e.target.value })} rows={3} placeholder="Details..." />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setEventOpen(false)} className="flex-1">Cancel</Button>
                <Button
                  onClick={handleEventSave}
                  disabled={eventForm.type === "task" ? (saving || !eventForm.title || !eventForm.date) : !eventForm.date}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {eventForm.type === "task" ? (saving ? "Adding..." : "Add Task") : "Add New"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}