import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, ChevronLeft, ChevronRight, Bell, MapPin, Clock, User, History, CalendarDays, X, CheckCircle2, Clock4, Users2, CheckSquare } from "lucide-react";
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

// Custom event renderer — jobs are colored blocks, tasks are tiny text
function CalendarEvent({ event }) {
  if (event.isTask) {
    return (
      <div className="px-1 text-[10px] leading-tight text-slate-500 truncate" title={event.title}>
        <CheckSquare className="w-2.5 h-2.5 inline-block mr-0.5 text-slate-400 flex-shrink-0" />
        {event.title}
      </div>
    );
  }
  return (
    <div className="px-1 text-[11px] leading-tight text-white font-medium truncate">
      {event.title}
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(defaultJob);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterTech, setFilterTech] = useState("all");
  const [historyMode, setHistoryMode] = useState(false);
  const [historyRange, setHistoryRange] = useState({
    from: moment().subtract(1, 'month').format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
  });

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

  const events = useMemo(() => {
    const result = [];

    filteredJobs.forEach(j => {
      if (!CALENDAR_JOB_STATUSES.has(j.status)) return;
      const cust = customers.find(c => c.id === j.customer_id);
      const customerName = cust ? `${cust.first_name} ${cust.last_name}` : "";

      // Legacy single appointment (scheduled_start)
      if (j.scheduled_start) {
        result.push({
          id: j.id,
          title: customerName ? `${j.title} · ${customerName}` : j.title,
          start: new Date(j.scheduled_start),
          end: j.scheduled_end
            ? new Date(j.scheduled_end)
            : new Date(new Date(j.scheduled_start).getTime() + 60 * 60 * 1000),
          resource: j,
          isAppointment: false,
          isTask: false,
        });
      }

      // Individual appointments from the appointments array
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
          isTask: false,
        });
      });
    });

    // Tasks — all-day events with minimal text styling
    tasks.forEach(task => {
      if (!task.due_date) return;
      const dueDate = new Date(task.due_date + "T00:00:00");
      result.push({
        id: `task_${task.id}`,
        title: task.title,
        start: dueDate,
        end: dueDate,
        resource: task,
        isTask: true,
        isAppointment: false,
      });
    });

    return result;
  }, [filteredJobs, customers, tasks]);

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
    // Tasks — tiny, transparent, no block
    if (event.isTask) {
      return {
        style: {
          backgroundColor: 'transparent',
          color: '#64748b',
          border: 'none',
          padding: '1px 3px',
          fontSize: '10px',
          fontWeight: '400',
          borderRadius: '0',
        }
      };
    }
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

  function handleSelectSlot(slot) {
    setEditing(null);
    const start = moment(slot.start);
    // In month view, react-big-calendar gives start===end, so default to 1 hour duration
    const end = slot.end > slot.start && (slot.end - slot.start) > 60 * 60 * 1000
      ? moment(slot.end)
      : moment(slot.start).add(1, 'hour');
    setForm({
      ...defaultJob,
      scheduled_start: start.format("YYYY-MM-DDTHH:mm"),
      scheduled_end: end.format("YYYY-MM-DDTHH:mm"),
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, company_id: activeCompany.id };
    if (editing) {
      await base44.entities.Job.update(editing.id, data);
    } else {
      await base44.entities.Job.create(data);
    }
    setSaving(false);
    setSheetOpen(false);
    await loadData();
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
    await base44.entities.Job.create({
      company_id: activeCompany.id,
      customer_id: customer?.id || booking.customer_id || "",
      title: booking.service_type || "Service Request",
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

  const toggleTech = (techId) => {
    setForm(f => ({
      ...f,
      assigned_techs: f.assigned_techs?.includes(techId)
        ? f.assigned_techs.filter(id => id !== techId)
        : [...(f.assigned_techs || []), techId]
    }));
  };

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
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
      {/* Pending bookings sidebar */}
      {bookings.length > 0 && (
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
                      if (from) setDate(new Date(from));
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
            {/* History / Live toggle */}
            <Button
              variant={historyMode ? "default" : "outline"}
              size="sm"
              className={`h-8 gap-1.5 text-xs ${historyMode ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
              onClick={() => {
                const nextMode = !historyMode;
                setHistoryMode(nextMode);
                if (nextMode) {
                  setDate(new Date(historyRange.from));
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
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 h-8" onClick={() => {
              setEditing(null);
              const now = moment().startOf('hour').add(1, 'hour');
              setForm({ ...defaultJob, scheduled_start: now.format("YYYY-MM-DDTHH:mm"), scheduled_end: now.clone().add(1, 'hour').format("YYYY-MM-DDTHH:mm") });
              setSheetOpen(true);
            }}>
              <Plus className="w-3.5 h-3.5" /> New Job
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap mb-2 flex-shrink-0">
          {STATUS_OPTIONS.filter(s => CALENDAR_JOB_STATUSES.has(s.value)).map(s => (
            <span key={s.value} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <CheckSquare className="w-3 h-3" />
            Tasks
          </span>
        </div>

        {/* History stats bar */}
        {historyMode && historyStats && (
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
            events={displayEvents}
            view={view}
            date={date}
            onNavigate={setDate}
            onView={setView}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            components={{ event: CalendarEvent }}
            toolbar={false}
            style={{ height: '100%' }}
          />
        </div>
      </div>

      {/* Job Modal */}
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">{editing ? "Edit Job" : "New Job"}</h2>
              <button onClick={() => setSheetOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Job Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Weekly Lawn Service" />
              </div>
              <div>
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Service Type</Label>
                  <Input value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input type="datetime-local" value={form.scheduled_start} onChange={e => setForm({ ...form, scheduled_start: e.target.value })} />
                </div>
                <div>
                  <Label>End</Label>
                  <Input type="datetime-local" value={form.scheduled_end} onChange={e => setForm({ ...form, scheduled_end: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
              </div>
              {techs.length > 0 && (
                <div>
                  <Label>Assign Technicians</Label>
                  <div className="space-y-2 mt-1.5 p-3 bg-slate-50 rounded-lg">
                    {techs.map(t => (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={form.assigned_techs?.includes(t.id)}
                          onCheckedChange={() => toggleTech(t.id)}
                        />
                        <span className="text-sm text-slate-700">{t.first_name} {t.last_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Job details..." />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.title} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Job"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}