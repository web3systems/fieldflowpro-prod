import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Link } from "react-router-dom";
import {
  ClipboardList, Search, Clock, User, Filter, Sparkles, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addDays } from "date-fns";
import WorkLogGroup from "@/components/worklogs/WorkLogGroup";
import WorkLogCard from "@/components/worklogs/WorkLogCard";

export default function WorkLogs() {
  const { activeCompany } = useApp();
  const [logs, setLogs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [techs, setTechs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTech, setFilterTech] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFollowUp, setFilterFollowUp] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const didAutoExpand = useRef(false);

  useEffect(() => {
    if (activeCompany) {
      didAutoExpand.current = false;
      loadData();
    }
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [l, j, t, c] = await Promise.all([
      base44.entities.WorkLog.filter({ company_id: activeCompany.id }, "-created_date", 200),
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
    ]);
    setLogs(l);
    setJobs(j);
    setTechs(t);
    setCustomers(c);
    setLoading(false);
  }

  const getJob = (id) => jobs.find(j => j.id === id);
  const getTech = (id) => techs.find(t => t.id === id);
  const getCustomer = (id) => customers.find(c => c.id === id);

  const filtered = logs.filter(log => {
    const job = getJob(log.job_id);
    const cust = job ? getCustomer(job.customer_id) : null;
    const custName = cust ? `${cust.first_name} ${cust.last_name}`.toLowerCase() : "";
    const q = search.toLowerCase();
    const matchSearch = !search ||
      log.technician_name?.toLowerCase().includes(q) ||
      job?.title?.toLowerCase().includes(q) ||
      custName.includes(q) ||
      log.work_performed?.toLowerCase().includes(q) ||
      log.ai_summary?.toLowerCase().includes(q);
    const matchTech = filterTech === "all" || log.technician_id === filterTech || log.technician_name === filterTech;
    const matchStatus = filterStatus === "all" || log.status === filterStatus;
    const matchFollowUp = !filterFollowUp || log.follow_up_needed;
    return matchSearch && matchTech && matchStatus && matchFollowUp;
  });

  const followUpCount = logs.filter(l => l.follow_up_needed).length;
  const totalHours = logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);

  // Group filtered logs by month → week → day
  const grouped = useMemo(() => {
    const months = {};
    filtered.forEach(log => {
      const d = log.date ? new Date(log.date) : new Date(log.created_date);
      if (isNaN(d.getTime())) return;
      const monthKey = `m:${format(d, "yyyy-MM")}`;
      const monthLabel = format(d, "MMMM yyyy");
      if (!months[monthKey]) months[monthKey] = { key: monthKey, label: monthLabel, weeks: {}, count: 0 };
      months[monthKey].count++;
      const ws = startOfWeek(d, { weekStartsOn: 0 });
      const weekKey = `w:${format(ws, "yyyy-MM-dd")}`;
      const weekLabel = `${format(ws, "MMM d")} – ${format(addDays(ws, 6), "MMM d, yyyy")}`;
      if (!months[monthKey].weeks[weekKey]) months[monthKey].weeks[weekKey] = { key: weekKey, label: weekLabel, days: {}, count: 0 };
      months[monthKey].weeks[weekKey].count++;
      const dayKey = `d:${format(d, "yyyy-MM-dd")}`;
      const dayLabel = format(d, "EEEE, MMM d");
      if (!months[monthKey].weeks[weekKey].days[dayKey]) months[monthKey].weeks[weekKey].days[dayKey] = { key: dayKey, label: dayLabel, logs: [] };
      months[monthKey].weeks[weekKey].days[dayKey].logs.push(log);
    });
    return Object.values(months)
      .sort((a, b) => b.key.localeCompare(a.key))
      .map(m => ({
        ...m,
        weeks: Object.values(m.weeks).sort((a, b) => b.key.localeCompare(a.key)).map(w => ({
          ...w,
          days: Object.values(w.days).sort((a, b) => b.key.localeCompare(a.key)),
        })),
      }));
  }, [filtered]);

  // Auto-expand the most recent month, week, and day on first load
  useEffect(() => {
    if (didAutoExpand.current || grouped.length === 0) return;
    didAutoExpand.current = true;
    const latest = grouped[0];
    const latestWeek = latest.weeks[0];
    const latestDay = latestWeek?.days[0];
    setExpandedGroups(new Set([latest.key, latestWeek?.key, latestDay?.key].filter(Boolean)));
  }, [grouped]);

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  async function markReviewed(log) {
    await base44.entities.WorkLog.update(log.id, { status: "reviewed" });
    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, status: "reviewed" } : l));
  }

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-500" /> Work Logs
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Field technician daily work records</p>
        </div>
        <Link to="/FieldTechAgent">
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:brightness-110">
            <Sparkles className="w-4 h-4" /> Log Work with AI
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-2xl font-bold text-blue-700">{logs.length}</p>
          <p className="text-xs text-slate-500">Total Logs</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 cursor-pointer" onClick={() => setFilterFollowUp(!filterFollowUp)}>
          <p className="text-2xl font-bold text-amber-700">{followUpCount}</p>
          <p className="text-xs text-slate-500">Need Follow-Up {filterFollowUp && "✓"}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-2xl font-bold text-green-700">{(totalHours / 60).toFixed(1)}h</p>
          <p className="text-xs text-slate-500">Total Hours Logged</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs, jobs, customers..." className="pl-9" />
        </div>
        <Select value={filterTech} onValueChange={setFilterTech}>
          <SelectTrigger className="w-44">
            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <SelectValue placeholder="All Techs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            {techs.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No work logs found</p>
            <p className="text-slate-400 text-sm mt-1">Technicians can log their work using the AI Field Tech Agent</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {grouped.map(month => (
            <WorkLogGroup
              key={month.key}
              icon={Calendar}
              label={month.label}
              count={month.count}
              isExpanded={expandedGroups.has(month.key)}
              onToggle={() => toggleGroup(month.key)}
            >
              {month.weeks.map(week => (
                <WorkLogGroup
                  key={week.key}
                  icon={Calendar}
                  label={week.label}
                  count={week.count}
                  isExpanded={expandedGroups.has(week.key)}
                  onToggle={() => toggleGroup(week.key)}
                  level={1}
                >
                  {week.days.map(day => (
                    <WorkLogGroup
                      key={day.key}
                      icon={Clock}
                      label={day.label}
                      count={day.logs.length}
                      isExpanded={expandedGroups.has(day.key)}
                      onToggle={() => toggleGroup(day.key)}
                      level={2}
                    >
                      {day.logs.map(log => {
                        const job = getJob(log.job_id);
                        const cust = job ? getCustomer(job.customer_id) : null;
                        return (
                          <WorkLogCard
                            key={log.id}
                            log={log}
                            job={job}
                            customer={cust}
                            isExpanded={expanded === log.id}
                            onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
                            onMarkReviewed={() => markReviewed(log)}
                          />
                        );
                      })}
                    </WorkLogGroup>
                  ))}
                </WorkLogGroup>
              ))}
            </WorkLogGroup>
          ))}
        </div>
      )}
    </div>
  );
}