import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Users, Briefcase, FileText, DollarSign,
  UserPlus, Settings, Building2, CalendarDays, Bell, MessageCircle,
  Calculator, Wrench, BookOpen, Mail, CreditCard, BarChart3,
  ChevronRight, Search, ChevronDown, ChevronUp, Home, Globe,
  HelpCircle, MessageSquare, CheckCircle2, ListChecks, Monitor, Camera
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { sections } from "@/components/docs/docSections";
import DocScreenshot from "@/components/docs/DocScreenshot";

const ICON_MAP = {
  dashboard: LayoutDashboard,
  leads: UserPlus,
  customers: Users,
  estimates: FileText,
  jobs: Briefcase,
  schedule: CalendarDays,
  invoices: DollarSign,
  payments: CreditCard,
  notifications: Bell,
  messages: MessageCircle,
  accounting: Calculator,
  team: Wrench,
  pricebook: BookOpen,
  settings: Settings,
  "email-templates": Mail,
  employees: Users,
  "customer-portal": Globe,
};

const tagColors = {
  "All Users": "bg-blue-100 text-blue-700",
  "Managers & Admins": "bg-purple-100 text-purple-700",
  "Admins Only": "bg-red-100 text-red-700",
  "Customers": "bg-green-100 text-green-700",
};

function StepBlock({ index, step }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-slate-800 text-sm mb-1">{step.title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{step.body}</p>
      </div>
    </div>
  );
}

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors gap-3"
      >
        <span className="text-sm font-medium text-slate-800">{faq.q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-white">
          <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, isOpen, onToggle }) {
  const Icon = ICON_MAP[section.id] || HelpCircle;
  const [activeTab, setActiveTab] = useState("steps");

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${section.colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">{section.label}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tagColors[section.tag]}`}>{section.tag}</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{section.summary}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-xs text-slate-400">
          <span className="hidden sm:flex items-center gap-1"><ListChecks className="w-3 h-3" />{section.steps?.length} steps</span>
          <span className="hidden sm:flex items-center gap-1"><MessageSquare className="w-3 h-3" />{section.faqs?.length} FAQs</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100">
          {/* Tab Bar */}
          <div className="flex border-b border-slate-100 bg-slate-50 px-5">
            {[
              { key: "steps", label: "How To Use", icon: ListChecks },
              { key: "faq", label: `FAQ (${section.faqs?.length || 0})`, icon: MessageSquare },
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Steps Tab */}
          {activeTab === "steps" && (
            <div className="px-5 py-5 space-y-5">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-sm text-blue-800 leading-relaxed">{section.summary}</p>
              </div>

              {/* Screenshot placeholder */}
              {section.screenshot && (
                <DocScreenshot
                  placeholderText={section.screenshot.placeholder}
                  caption={section.screenshot.caption}
                  hint="Replace this placeholder with an actual screenshot once the app is live."
                />
              )}

              {/* Numbered Steps */}
              <div className="space-y-5">
                {section.steps?.map((step, i) => (
                  <StepBlock key={i} index={i} step={step} />
                ))}
              </div>
            </div>
          )}

          {/* FAQ Tab */}
          {activeTab === "faq" && (
            <div className="px-5 py-5">
              {section.faqs && section.faqs.length > 0 ? (
                <div className="space-y-2">
                  {section.faqs.map((faq, i) => (
                    <FaqItem key={i} faq={faq} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">No FAQs for this section yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Documentation() {
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState(new Set(["dashboard"]));
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "All Users", "Managers & Admins", "Admins Only", "Customers"];

  const filtered = sections.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = q === "" ||
      s.label.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.steps?.some(st => st.title.toLowerCase().includes(q) || st.body.toLowerCase().includes(q)) ||
      s.faqs?.some(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
    const matchesFilter = activeFilter === "All" || s.tag === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const toggleSection = (id) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(filtered.map(s => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link to={createPageUrl("Dashboard")} className="hover:text-slate-700 flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-medium">Documentation</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">FieldFlow Pro Documentation</h1>
          <p className="text-slate-500 mt-2 text-base">Step-by-step guides, screenshot references, and FAQs for every feature. Select a section to expand it.</p>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(tagColors).map(([label, cls]) => (
              <span key={label} className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search steps, FAQs, or any topic..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  activeFilter === f
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">{filtered.length} section{filtered.length !== 1 ? "s" : ""}</p>
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Expand All</button>
            <span className="text-slate-300">|</span>
            <button onClick={collapseAll} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Collapse All</button>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {filtered.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              isOpen={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Screenshot note */}
        <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Camera className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Screenshot placeholders</strong> appear throughout this documentation. Replace them with actual screenshots by updating the <code className="bg-amber-100 px-1 rounded">screenshot</code> data in <code className="bg-amber-100 px-1 rounded">components/docs/docSections.js</code> — swap <code className="bg-amber-100 px-1 rounded">placeholderText</code> for an <code className="bg-amber-100 px-1 rounded">imageUrl</code> and update the DocScreenshot component to render an <code className="bg-amber-100 px-1 rounded">&lt;img&gt;</code> tag.
          </p>
        </div>

        {/* Footer Help */}
        <div className="mt-6 p-6 bg-blue-50 rounded-xl border border-blue-100 text-center">
          <h3 className="font-semibold text-slate-900 mb-1">Need more help?</h3>
          <p className="text-sm text-slate-600 mb-4">Contact our support team or submit a support ticket directly from your account.</p>
          <Link to={createPageUrl("Dashboard")} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Home className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}