import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Plug } from "lucide-react";

const CONNECTORS = [
  {
    id: "googlecalendar",
    name: "Google Calendar",
    description: "Sync scheduled jobs to your team's calendars. Get reminders and two-way updates.",
    category: "Scheduling",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
    color: "from-blue-50 to-indigo-50",
    border: "border-blue-100",
    badge: "bg-blue-100 text-blue-700",
    popular: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Send and receive customer emails from within FieldFlow. Capture inbound leads automatically.",
    category: "Communication",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
    color: "from-red-50 to-orange-50",
    border: "border-red-100",
    badge: "bg-red-100 text-red-700",
    popular: true,
  },
  {
    id: "outlook",
    name: "Outlook / Office 365",
    description: "Connect your Microsoft email and calendar to sync jobs and communicate with customers.",
    category: "Communication",
    logo: "https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018–present%29.svg",
    color: "from-blue-50 to-cyan-50",
    border: "border-blue-100",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    id: "slackbot",
    name: "Slack",
    description: "Get real-time alerts in Slack when new jobs are created, payments received, or leads come in.",
    category: "Team Alerts",
    logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
    color: "from-purple-50 to-pink-50",
    border: "border-purple-100",
    badge: "bg-purple-100 text-purple-700",
    popular: true,
  },
  {
    id: "googledrive",
    name: "Google Drive",
    description: "Auto-save job photos, signed estimates, and invoices to organized folders in Drive.",
    category: "File Storage",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg",
    color: "from-green-50 to-teal-50",
    border: "border-green-100",
    badge: "bg-green-100 text-green-700",
  },
  {
    id: "one_drive",
    name: "OneDrive",
    description: "Back up job documents and photos to your Microsoft OneDrive storage automatically.",
    category: "File Storage",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019–present%29.svg",
    color: "from-blue-50 to-sky-50",
    border: "border-sky-100",
    badge: "bg-sky-100 text-sky-700",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync leads and customers to your HubSpot CRM. Keep sales and field ops in sync.",
    category: "CRM",
    logo: "https://www.hubspot.com/hubfs/assets/hubspot.com/style-guide/brand-guidelines/guidelines_approved-sprocket-_2.png",
    color: "from-orange-50 to-amber-50",
    border: "border-orange-100",
    badge: "bg-orange-100 text-orange-700",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Export invoices, payments, and expenses to QuickBooks for seamless bookkeeping.",
    category: "Accounting",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Intuit_QuickBooks_logo.png",
    color: "from-green-50 to-emerald-50",
    border: "border-green-100",
    badge: "bg-green-100 text-green-700",
    comingSoon: true,
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Let customers self-book service appointments. Auto-create leads when a booking is made.",
    category: "Scheduling",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Calendly_2021.svg",
    color: "from-indigo-50 to-violet-50",
    border: "border-indigo-100",
    badge: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Push job and customer data to Airtable for custom reporting and operations dashboards.",
    category: "Data",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Airtable_Logo.svg",
    color: "from-yellow-50 to-orange-50",
    border: "border-yellow-100",
    badge: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "typeform",
    name: "Typeform",
    description: "Capture leads and job requests from Typeform surveys. Auto-create customers on submission.",
    category: "Lead Capture",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Typeform-logo.svg",
    color: "from-slate-50 to-zinc-50",
    border: "border-slate-100",
    badge: "bg-slate-100 text-slate-700",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Sync job notes, SOPs, and team documentation between FieldFlow and your Notion workspace.",
    category: "Productivity",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
    color: "from-slate-50 to-gray-50",
    border: "border-slate-100",
    badge: "bg-slate-100 text-slate-700",
  },
];

const CATEGORIES = ["All", "Scheduling", "Communication", "Team Alerts", "File Storage", "CRM", "Accounting", "Lead Capture", "Productivity", "Data"];

export default function ConnectorsTab({ company }) {
  const [filter, setFilter] = useState("All");
  const [connecting, setConnecting] = useState(null);
  // In a real implementation, connected state would be stored in the company record
  const [connected, setConnected] = useState({});

  const filtered = CONNECTORS.filter(c => filter === "All" || c.category === filter);

  function handleConnect(connector) {
    if (connector.comingSoon) return;
    // For now, show a toast-like state; real OAuth would call request_oauth_authorization
    setConnecting(connector.id);
    setTimeout(() => {
      setConnected(prev => ({ ...prev, [connector.id]: true }));
      setConnecting(null);
    }, 1200);
  }

  function handleDisconnect(connectorId) {
    setConnected(prev => {
      const next = { ...prev };
      delete next[connectorId];
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Plug className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Integrations & Connectors</h2>
          <p className="text-sm text-slate-500 mt-0.5">Connect your favorite tools to automate workflows and keep everything in sync.</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === cat
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Connector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(connector => {
          const isConnected = !!connected[connector.id];
          const isConnecting = connecting === connector.id;

          return (
            <div
              key={connector.id}
              className={`relative rounded-2xl border bg-gradient-to-br ${connector.color} ${connector.border} p-5 flex flex-col gap-3 transition-shadow hover:shadow-md`}
            >
              {/* Popular badge */}
              {connector.popular && (
                <span className="absolute top-3 right-3 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              {connector.comingSoon && (
                <span className="absolute top-3 right-3 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}

              {/* Logo + Name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center p-2 flex-shrink-0">
                  <img
                    src={connector.logo}
                    alt={connector.name}
                    className="w-full h-full object-contain"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{connector.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${connector.badge}`}>
                    {connector.category}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed flex-1">{connector.description}</p>

              {/* Action */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium flex-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Connected
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnect(connector.id)}
                      className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(connector)}
                    disabled={isConnecting || connector.comingSoon}
                    className="w-full h-8 text-xs bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 shadow-sm gap-1.5"
                    variant="outline"
                  >
                    {isConnecting ? (
                      <><div className="w-3 h-3 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> Connecting...</>
                    ) : connector.comingSoon ? (
                      "Coming Soon"
                    ) : (
                      <><ExternalLink className="w-3 h-3" /> Connect</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 text-center pt-2">
        More integrations coming soon. Have a request? Contact support.
      </p>
    </div>
  );
}