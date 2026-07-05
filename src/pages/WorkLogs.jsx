import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Link } from "react-router-dom";
import {
  ClipboardList, Search, Clock, User, CheckCircle, AlertTriangle,
  ChevronRight, FileText, Calendar, Filter, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const STATUS_COLORS = {
  submitted: "bg-blue-100 text-blue-700",
  reviewed: "bg-green-100 text-green-700",
  draft: "bg-slate-100 text-slate-600",
};

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

  useEffect(() => {
    if (activeCompany) loadData();
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
        <div className="space-y-3">
          {filtered.map(log => {
            const job = getJob(log.job_id);
            const cust = job ? getCustomer(job.customer_id) : null;
            const isExpanded = expanded === log.id;

            return (
              <Card key={log.id} className={`border shadow-sm transition-all ${log.follow_up_needed ? "border-l-4 border-l-amber-400" : ""}`}>
                <CardContent className="p-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{log.technician_name}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[log.status] || ""}`}>{log.status}</Badge>
                        {log.follow_up_needed && (
                          <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1 inline" /> Follow-up needed
                          </Badge>
                        )}
                        {log.customer_satisfied === false && (
                          <Badge className="text-xs bg-red-100 text-red-700">Customer concern</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {job && (
                          <Link
                            to={`/JobDetail/${job.id}`}
                            onClick={e => e.stopPropagation()}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />{job.title}
                          </Link>
                        )}
                        {cust && <span className="text-xs text-slate-500"><User className="w-3 h-3 inline mr-0.5" />{cust.first_name} {cust.last_name}</span>}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{log.date ? format(new Date(log.date), "MMM d, yyyy") : ""}
                        </span>
                        {log.duration_minutes && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m
                          </span>
                        )}
                      </div>
                      {/* AI Summary — always visible, key for office staff */}
                      {log.ai_summary && (
                        <p className="text-sm text-slate-600 mt-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                          <Sparkles className="w-3 h-3 inline mr-1 text-blue-500" />
                          {log.ai_summary}
                        </p>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      {log.work_performed && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Work Performed</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.work_performed}</p>
                        </div>
                      )}
                      {log.materials_used?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Materials Used</p>
                          <div className="space-y-1">
                            {log.materials_used.map((m, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                <span className="font-medium">{m.name}</span>
                                <span className="text-slate-400">×{m.quantity} {m.unit}</span>
                                {m.cost && <span className="text-slate-400">${m.cost}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.issues_found && (
                        <div>
                          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Issues Found</p>
                          <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">{log.issues_found}</p>
                        </div>
                      )}
                      {log.follow_up_notes && (
                        <div>
                          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Follow-Up Notes</p>
                          <p className="text-sm text-amber-800">{log.follow_up_notes}</p>
                        </div>
                      )}
                      {log.clock_in && log.clock_out && (
                        <p className="text-xs text-slate-400">
                          On site: {format(new Date(log.clock_in), "h:mm a")} – {format(new Date(log.clock_out), "h:mm a")}
                        </p>
                      )}
                      {log.voice_transcript && (
                        <details className="text-xs text-slate-400">
                          <summary className="cursor-pointer hover:text-slate-600">View voice transcript</summary>
                          <p className="mt-1 p-2 bg-slate-50 rounded text-slate-500 whitespace-pre-wrap">{log.voice_transcript}</p>
                        </details>
                      )}
                      {log.status === "submitted" && (
                        <Button size="sm" variant="outline" className="gap-1.5 text-green-700" onClick={() => markReviewed(log)}>
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Reviewed
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}