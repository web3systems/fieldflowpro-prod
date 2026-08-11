import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, Users, Briefcase, DollarSign, UserPlus, X, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "customers", label: "Customers", icon: Users },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "invoices", label: "Invoices", icon: DollarSign },
  { key: "leads", label: "Leads", icon: UserPlus },
  { key: "estimates", label: "Estimates", icon: FileText },
];

export default function GlobalSearch({ jobs, customers, invoices, leads, estimates = [] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const q = query.toLowerCase().trim();

  const matchedCustomers = (filter === "all" || filter === "customers") && q
    ? customers.filter(c =>
        `${c.first_name} ${c.last_name} ${c.business_name} ${c.email} ${c.phone} ${c.city}`.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchedJobs = (filter === "all" || filter === "jobs") && q
    ? jobs.filter(j =>
        `${j.title} ${j.description} ${j.address} ${j.status}`.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchedInvoices = (filter === "all" || filter === "invoices") && q
    ? invoices.filter(i =>
        `${i.invoice_number} ${i.status} ${i.total} ${i.notes}`.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const matchedLeads = (filter === "all" || filter === "leads") && q
    ? leads.filter(l =>
        `${l.first_name} ${l.last_name} ${l.email} ${l.phone} ${l.service_type}`.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const matchedEstimates = (filter === "all" || filter === "estimates") && q
    ? estimates.filter(e =>
        `${e.estimate_number} ${e.title} ${e.status}`.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const totalResults = matchedCustomers.length + matchedJobs.length + matchedInvoices.length + matchedLeads.length + matchedEstimates.length;
  const showDropdown = open && q.length > 0;

  async function handleAiQuery() {
    if (!q) return;
    setAiLoading(true);
    setAiResponse("");
    setOpen(false);
    try {
      const context = {
        total_customers: customers.length,
        total_jobs: jobs.length,
        active_jobs: jobs.filter(j => ["new","scheduled","in_progress"].includes(j.status)).length,
        completed_jobs: jobs.filter(j => j.status === "completed").length,
        total_revenue: invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0),
        pending_revenue: invoices.filter(i => ["sent","viewed","overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0),
        overdue_invoices: invoices.filter(i => i.status === "overdue").length,
        new_leads: leads.filter(l => l.status === "new").length,
        customers_sample: customers.slice(0, 50).map(c => ({
          name: c.business_name || `${c.first_name || ""} ${c.last_name || ""}`.trim(),
          email: c.email,
          status: c.status,
          city: c.city,
          total_revenue: c.total_revenue
        })),
        recent_jobs: jobs.slice(0, 30).map(j => ({
          title: j.title,
          status: j.status,
          total_amount: j.total_amount,
          scheduled_start: j.scheduled_start,
          address: j.address
        })),
        invoices_sample: invoices.slice(0, 40).map(i => ({
          invoice_number: i.invoice_number,
          status: i.status,
          total: i.total,
          due_date: i.due_date,
          paid_date: i.paid_date
        })),
      };
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful field service business assistant. The user asked: "${query}"\n\nHere is their current business data summary:\n${JSON.stringify(context, null, 2)}\n\nAnswer concisely and helpfully. Be specific with numbers and names when available. Keep it to 2-3 sentences max.`,
        response_json_schema: { type: "object", properties: { answer: { type: "string" } } }
      });
      setAiResponse(res.answer || "I couldn't find a clear answer based on your current data.");
    } catch (e) {
      setAiResponse("Sorry, I couldn't process that question. Please try again.");
    }
    setAiLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && q) handleAiQuery();
    if (e.key === "Escape") { setOpen(false); setQuery(""); setAiResponse(""); }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Main search bar */}
      <div className="relative flex items-center bg-white border-2 border-slate-200 focus-within:border-blue-400 rounded-2xl shadow-sm transition-all">
        <Search className="w-5 h-5 text-slate-400 ml-4 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setAiResponse(""); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search customers, jobs, invoices, leads… or press Enter to ask AI"
          className="flex-1 px-3 py-3.5 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(""); setAiResponse(""); setOpen(false); }} className="p-2 mr-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleAiQuery}
          disabled={!query || aiLoading}
          className="flex items-center gap-1.5 px-4 py-2 mr-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {aiLoading
            ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Sparkles className="w-3.5 h-3.5" />
          }
          <span className="hidden sm:inline">{aiLoading ? "Thinking…" : "Ask AI"}</span>
        </button>
      </div>

      {/* AI Answer */}
      {(aiLoading || aiResponse) && (
        <div className="mt-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-4 flex gap-3 items-start">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-purple-700 mb-1">AI Answer</p>
            {aiLoading ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <span>Analyzing your business data</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed">{aiResponse}</p>
            )}
          </div>
          {aiResponse && (
            <button onClick={() => setAiResponse("")} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {totalResults === 0 ? (
            <div className="p-6 text-center">
              <p className="text-slate-400 text-sm mb-3">No results for "{query}"</p>
              <button
                onClick={handleAiQuery}
                className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                <Sparkles className="w-4 h-4" /> Ask AI instead
              </button>
            </div>
          ) : (
            <div className="py-2">
              {matchedCustomers.length > 0 && (
                <ResultSection title="Customers">
                  {matchedCustomers.map(c => (
                    <Link key={c.id} to={`/CustomerDetail/${c.id}`} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.business_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()}</p>
                        <p className="text-xs text-slate-400 truncate">{c.email || c.phone || c.city || "Customer"}</p>
                      </div>
                    </Link>
                  ))}
                </ResultSection>
              )}
              {matchedJobs.length > 0 && (
                <ResultSection title="Jobs" border>
                  {matchedJobs.map(j => {
                    const cust = customers.find(c => c.id === j.customer_id);
                    return (
                      <Link key={j.id} to={`/JobDetail/${j.id}`} onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{j.title}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {cust ? (cust.business_name || `${cust.first_name} ${cust.last_name}`.trim()) : ""} · {j.status?.replace("_", " ")}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </ResultSection>
              )}
              {matchedInvoices.length > 0 && (
                <ResultSection title="Invoices" border>
                  {matchedInvoices.map(i => {
                    const cust = customers.find(c => c.id === i.customer_id);
                    return (
                      <Link key={i.id} to={`/InvoiceDetail/${i.id}`} onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-3.5 h-3.5 text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{i.invoice_number || "Invoice"} — ${(i.total || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-400 truncate">{cust ? (cust.business_name || `${cust.first_name} ${cust.last_name}`.trim()) : ""} · {i.status}</p>
                        </div>
                      </Link>
                    );
                  })}
                </ResultSection>
              )}
              {matchedLeads.length > 0 && (
                <ResultSection title="Leads" border>
                  {matchedLeads.map(l => (
                    <Link key={l.id} to={`/LeadDetail/${l.id}`} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{`${l.first_name || ""} ${l.last_name || ""}`.trim() || l.email}</p>
                        <p className="text-xs text-slate-400 truncate">{l.service_type || l.email} · {l.status}</p>
                      </div>
                    </Link>
                  ))}
                </ResultSection>
              )}
              {matchedEstimates.length > 0 && (
                <ResultSection title="Estimates" border>
                  {matchedEstimates.map(e => {
                    const cust = customers.find(c => c.id === e.customer_id);
                    return (
                      <Link key={e.id} to={`/EstimateDetail/${e.id}`} onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3.5 h-3.5 text-cyan-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{e.title || e.estimate_number || "Estimate"}</p>
                          <p className="text-xs text-slate-400 truncate">{cust ? (cust.business_name || `${cust.first_name} ${cust.last_name}`.trim()) : ""} · {e.status}</p>
                        </div>
                      </Link>
                    );
                  })}
                </ResultSection>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, children, border }) {
  return (
    <div className={border ? "border-t border-slate-100" : ""}>
      <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</div>
      {children}
    </div>
  );
}