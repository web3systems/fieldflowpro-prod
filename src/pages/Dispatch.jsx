import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Link } from "react-router-dom";
import {
  MapPin, Clock, User, AlertTriangle, CheckCircle, Zap, Phone,
  ChevronRight, Plus, Send, RefreshCw, Bot, MessageSquare, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import DispatchAIPanel from "@/components/dispatch/DispatchAIPanel";

const PRIORITY_COLOR = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_COLOR = {
  new: "bg-blue-100 text-blue-700",
  scheduled: "bg-purple-100 text-purple-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  on_hold: "bg-gray-100 text-gray-600",
};

export default function Dispatch() {
  const { activeCompany } = useApp();
  const [jobs, setJobs] = useState([]);
  const [techs, setTechs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dispatchNotes, setDispatchNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unassigned"); // unassigned | today | all
  const [assigningJob, setAssigningJob] = useState(null); // job being assigned
  const [selectedTech, setSelectedTech] = useState("");
  const [dispatchMessage, setDispatchMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [j, t, c, d] = await Promise.all([
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Technician.filter({ company_id: activeCompany.id, status: "active" }),
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.DispatchNote.filter({ company_id: activeCompany.id }, "-created_date", 100),
    ]);
    setJobs(j);
    setTechs(t);
    setCustomers(c);
    setDispatchNotes(d);
    setLoading(false);
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const filteredJobs = jobs.filter(j => {
    if (j.status === "completed" || j.status === "cancelled") return false;
    if (filter === "unassigned") return !j.assigned_techs?.length;
    if (filter === "today") return j.scheduled_start?.startsWith(todayStr);
    return true;
  }).sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
  });

  const getCustomer = (id) => customers.find(c => c.id === id);
  const getTech = (id) => techs.find(t => t.id === id);

  // Stats for header
  const unassignedCount = jobs.filter(j => !j.assigned_techs?.length && !["completed","cancelled"].includes(j.status)).length;
  const todayCount = jobs.filter(j => j.scheduled_start?.startsWith(todayStr) && !["completed","cancelled"].includes(j.status)).length;
  const urgentCount = jobs.filter(j => j.priority === "urgent" && !["completed","cancelled"].includes(j.status)).length;

  // Per-tech workload
  const techWorkload = techs.map(t => ({
    ...t,
    activeJobs: jobs.filter(j => j.assigned_techs?.includes(t.id) && ["new","scheduled","in_progress"].includes(j.status)),
    inProgressJobs: jobs.filter(j => j.assigned_techs?.includes(t.id) && j.status === "in_progress"),
  }));

  async function handleAssign(job, techId, message) {
    const tech = getTech(techId);
    if (!tech) return;
    await base44.entities.Job.update(job.id, { assigned_techs: [techId], status: job.status === "new" ? "scheduled" : job.status });
    // Create dispatch note
    await base44.entities.DispatchNote.create({
      company_id: activeCompany.id,
      job_id: job.id,
      technician_id: techId,
      message: message || `Assigned to ${tech.first_name} ${tech.last_name}`,
      dispatched_by: "Dispatcher",
      dispatched_at: new Date().toISOString(),
      type: job.assigned_techs?.length ? "reassignment" : "assignment",
    });
    setAssigningJob(null);
    setSelectedTech("");
    setDispatchMessage("");
    await loadData();
  }

  async function sendSmsToTech(tech, job, message) {
    if (!tech.phone) { alert("This technician has no phone number on file."); return; }
    setSendingSms(true);
    const cust = getCustomer(job.customer_id);
    const fullMsg = message || `You've been assigned to: ${job.title}. Customer: ${cust ? `${cust.first_name} ${cust.last_name}` : "See app"}. ${job.address ? `Address: ${job.address}, ${job.city}` : ""} ${job.scheduled_start ? `Scheduled: ${format(new Date(job.scheduled_start), "MMM d h:mm a")}` : ""}`.trim();
    await base44.functions.invoke("sendSmsDispatch", {
      to: tech.phone,
      message: fullMsg,
      job_id: job.id,
      company_id: activeCompany.id,
    }).catch(e => console.error("SMS error:", e));
    setSendingSms(false);
  }

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" /> Dispatch Board
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Assign and coordinate field technicians</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={() => setShowAI(true)}>
            <Bot className="w-4 h-4" /> AI Dispatch Assistant
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Unassigned Jobs", value: unassignedCount, color: "text-red-600", bg: "bg-red-50", action: () => setFilter("unassigned") },
          { label: "Today's Jobs", value: todayCount, color: "text-blue-600", bg: "bg-blue-50", action: () => setFilter("today") },
          { label: "Urgent", value: urgentCount, color: "text-orange-600", bg: "bg-orange-50", action: () => setFilter("all") },
        ].map(s => (
          <button key={s.label} onClick={s.action} className={`${s.bg} rounded-xl p-3 text-left hover:brightness-95 transition-all`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Jobs Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            {[
              { key: "unassigned", label: `Unassigned (${unassignedCount})` },
              { key: "today", label: `Today (${todayCount})` },
              { key: "all", label: "All Active" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  filter === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : filteredJobs.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="p-10 text-center text-slate-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                <p className="font-medium">All jobs are assigned!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map(job => {
                const cust = getCustomer(job.customer_id);
                const assignedTechs = (job.assigned_techs || []).map(id => getTech(id)).filter(Boolean);
                const isBeingAssigned = assigningJob?.id === job.id;
                const lastNote = dispatchNotes.filter(n => n.job_id === job.id)[0];

                return (
                  <Card key={job.id} className={`border shadow-sm transition-all ${isBeingAssigned ? "border-blue-300 shadow-blue-100" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/JobDetail/${job.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                              {job.title}
                            </Link>
                            <Badge className={`text-xs border ${PRIORITY_COLOR[job.priority] || ""}`}>{job.priority}</Badge>
                            <Badge className={`text-xs ${STATUS_COLOR[job.status] || ""}`}>{job.status?.replace("_"," ")}</Badge>
                          </div>
                          {cust && (
                            <p className="text-sm text-slate-500 mt-0.5">
                              <User className="w-3 h-3 inline mr-1" />
                              {cust.first_name} {cust.last_name}
                              {cust.phone && <a href={`tel:${cust.phone}`} className="ml-2 text-blue-500 hover:underline"><Phone className="w-3 h-3 inline" /> {cust.phone}</a>}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {job.scheduled_start && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{format(new Date(job.scheduled_start), "MMM d, h:mm a")}
                              </span>
                            )}
                            {job.address && (
                              <a href={`https://maps.google.com/?q=${encodeURIComponent([job.address,job.city,job.state].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                                <MapPin className="w-3 h-3" />{job.address}
                              </a>
                            )}
                          </div>
                          {assignedTechs.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {assignedTechs.map(t => (
                                <span key={t.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                                  <User className="w-2.5 h-2.5" />{t.first_name} {t.last_name}
                                </span>
                              ))}
                            </div>
                          )}
                          {lastNote && (
                            <p className="text-xs text-slate-400 mt-1 italic truncate">
                              <MessageSquare className="w-3 h-3 inline mr-0.5" />Last dispatch: {lastNote.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <Button
                            size="sm"
                            variant={isBeingAssigned ? "default" : "outline"}
                            className={`text-xs gap-1 ${isBeingAssigned ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                            onClick={() => {
                              if (isBeingAssigned) { setAssigningJob(null); setSelectedTech(""); setDispatchMessage(""); }
                              else { setAssigningJob(job); setSelectedTech(job.assigned_techs?.[0] || ""); }
                            }}
                          >
                            {isBeingAssigned ? <X className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                            {isBeingAssigned ? "Cancel" : (assignedTechs.length ? "Reassign" : "Assign")}
                          </Button>
                        </div>
                      </div>

                      {/* Assign panel */}
                      {isBeingAssigned && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                          <Select value={selectedTech} onValueChange={setSelectedTech}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select technician..." />
                            </SelectTrigger>
                            <SelectContent>
                              {techs.map(t => {
                                const wl = techWorkload.find(tw => tw.id === t.id);
                                return (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.first_name} {t.last_name}
                                    {wl ? ` · ${wl.activeJobs.length} jobs` : ""}
                                    {wl?.inProgressJobs.length ? " 🔴" : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Textarea
                            value={dispatchMessage}
                            onChange={e => setDispatchMessage(e.target.value)}
                            placeholder="Optional dispatch message (sent via SMS)..."
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={!selectedTech}
                              className="bg-blue-600 hover:bg-blue-700 gap-1.5"
                              onClick={() => handleAssign(job, selectedTech, dispatchMessage)}
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Assign
                            </Button>
                            {selectedTech && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-green-700"
                                disabled={sendingSms}
                                onClick={async () => {
                                  await handleAssign(job, selectedTech, dispatchMessage);
                                  const tech = getTech(selectedTech);
                                  if (tech) await sendSmsToTech(tech, job, dispatchMessage);
                                }}
                              >
                                <Send className="w-3.5 h-3.5" /> Assign + SMS
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Technicians Column */}
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4" /> Field Team
            <span className="text-xs text-slate-400 font-normal ml-auto">{techs.length} active</span>
          </h2>
          {techWorkload.map(tech => (
            <Card key={tech.id} className="border shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: tech.color || "#3b82f6" }}
                  >
                    {tech.first_name?.[0]}{tech.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{tech.first_name} {tech.last_name}</p>
                    {tech.phone && <a href={`tel:${tech.phone}`} className="text-xs text-blue-500 hover:underline">{tech.phone}</a>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      tech.inProgressJobs.length > 0 ? "bg-amber-100 text-amber-700" :
                      tech.activeJobs.length > 0 ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {tech.inProgressJobs.length > 0 ? "On Job" : tech.activeJobs.length > 0 ? "Assigned" : "Available"}
                    </span>
                  </div>
                </div>
                {tech.activeJobs.length > 0 && (
                  <div className="space-y-1">
                    {tech.activeJobs.slice(0,3).map(j => (
                      <Link key={j.id} to={`/JobDetail/${j.id}`} className="flex items-center justify-between text-xs text-slate-600 hover:text-blue-600 py-0.5 px-1.5 rounded hover:bg-slate-50">
                        <span className="truncate flex-1">{j.title}</span>
                        <span className={`ml-2 flex-shrink-0 ${j.status === "in_progress" ? "text-amber-600 font-medium" : "text-slate-400"}`}>
                          {j.status?.replace("_"," ")}
                        </span>
                      </Link>
                    ))}
                    {tech.activeJobs.length > 3 && <p className="text-xs text-slate-400 px-1.5">+{tech.activeJobs.length - 3} more</p>}
                  </div>
                )}
                {tech.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tech.skills.slice(0,3).map(s => <span key={s} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {techs.length === 0 && (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="p-6 text-center text-slate-400 text-sm">
                <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No technicians. Add them in Team settings.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showAI && (
        <DispatchAIPanel
          jobs={filteredJobs}
          techs={techs}
          customers={customers}
          company={activeCompany}
          onClose={() => setShowAI(false)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}