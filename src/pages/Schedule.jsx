import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, ChevronLeft, ChevronRight, Bell, MapPin, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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

export default function Schedule() {
  const { activeCompany } = useApp();
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [techs, setTechs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(defaultJob);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterTech, setFilterTech] = useState("all");

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    const [j, c, t, b] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
      base44.entities.ServiceBooking.filter({ company_id: activeCompany.id, status: "pending" }),
    ]);
    setJobs(j);
    setCustomers(c);
    setTechs(t);
    setBookings(b);
  }

  const filteredJobs = useMemo(() => {
    if (filterTech === "all") return jobs;
    return jobs.filter(j => j.assigned_techs?.includes(filterTech));
  }, [jobs, filterTech]);

  const events = useMemo(() => {
    return filteredJobs
      .filter(j => j.scheduled_start)
      .map(j => {
        const cust = customers.find(c => c.id === j.customer_id);
        const customerName = cust ? `${cust.first_name} ${cust.last_name}` : "";
        return {
          id: j.id,
          title: customerName ? `${j.title} · ${customerName}` : j.title,
          start: new Date(j.scheduled_start),
          end: j.scheduled_end
            ? new Date(j.scheduled_end)
            : new Date(new Date(j.scheduled_start).getTime() + 60 * 60 * 1000),
          resource: j,
        };
      });
  }, [filteredJobs, customers]);

  const eventStyleGetter = (event) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === event.resource?.status);
    return {
      style: {
        backgroundColor: statusOption?.color || '#3b82f6',
        borderRadius: '5px',
        color: 'white',
        border: 'none',
        padding: '2px 5px',
        fontSize: '12px',
        fontWeight: '500',
      }
    };
  };

  function handleSelectEvent(event) {
    const job = event.resource;
    setEditing(job);
    setForm({ ...defaultJob, ...job, assigned_techs: job.assigned_techs || [] });
    setSheetOpen(true);
  }

  function handleSelectSlot(slot) {
    setEditing(null);
    setForm({
      ...defaultJob,
      scheduled_start: moment(slot.start).format("YYYY-MM-DDTHH:mm"),
      scheduled_end: moment(slot.end).format("YYYY-MM-DDTHH:mm"),
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

  const navigate = (direction) => {
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
            <Button variant="outline" size="sm" className="h-8" onClick={() => setDate(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
            <h2 className="text-base font-semibold text-slate-800">{dateLabel()}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 h-8" onClick={() => { setEditing(null); setForm(defaultJob); setSheetOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> New Job
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap mb-2 flex-shrink-0">
          {STATUS_OPTIONS.map(s => (
            <span key={s.value} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>

        {/* Calendar */}
        <div className="flex-1 min-h-0">
          <Calendar
            localizer={localizer}
            events={events}
            view={view}
            date={date}
            onNavigate={setDate}
            onView={setView}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            toolbar={false}
            style={{ height: '100%' }}
          />
        </div>
      </div>

      {/* Job Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Job" : "New Job"}</SheetTitle>
            <SheetDescription>{editing ? "Update job details and schedule." : "Create a new job and add it to the schedule."}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
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
        </SheetContent>
      </Sheet>
    </div>
  );
}