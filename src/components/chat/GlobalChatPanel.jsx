import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Search, ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ChatWindow from "./ChatWindow";

export default function GlobalChatPanel({ user, company }) {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [threads, setThreads] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && company) loadData();
  }, [open, company]);

  useEffect(() => {
    if (!company) return;
    const unsub = base44.entities.ChatMessage.subscribe(event => {
      if (event.data?.company_id === company.id && event.type === "create") {
        const cid = event.data.customer_id;
        setThreads(prev => ({ ...prev, [cid]: event.data }));
        if (!event.data.is_read_by_staff && event.data.sender_type === "customer") {
          setUnreadCounts(prev => ({ ...prev, [cid]: (prev[cid] || 0) + 1 }));
        }
      }
    });
    return unsub;
  }, [company]);

  async function loadData() {
    setLoading(true);
    const [c, msgs] = await Promise.all([
      base44.entities.Customer.filter({ company_id: company.id }),
      base44.entities.ChatMessage.filter({ company_id: company.id }, "-created_date", 500),
    ]);
    setCustomers(c);
    const threadMap = {};
    const unreadMap = {};
    msgs.forEach(msg => {
      if (!threadMap[msg.customer_id]) threadMap[msg.customer_id] = msg;
      if (!msg.is_read_by_staff && msg.sender_type === "customer") {
        unreadMap[msg.customer_id] = (unreadMap[msg.customer_id] || 0) + 1;
      }
    });
    setThreads(threadMap);
    setUnreadCounts(unreadMap);
    setLoading(false);
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const customersWithMessages = customers.filter(c => threads[c.id]);
  const filteredWithMessages = customersWithMessages.filter(c =>
    !search || `${c.first_name} ${c.last_name} ${c.phone || ""}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOthers = search
    ? customers.filter(c => !threads[c.id] && `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()))
    : [];

  function selectCustomer(cust) {
    setSelectedCustomer(cust);
    setUnreadCounts(prev => ({ ...prev, [cust.id]: 0 }));
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-blue-600 hover:bg-blue-700 text-white px-2 py-4 rounded-l-xl shadow-lg flex flex-col items-center gap-1.5 transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-900 text-white flex-shrink-0">
          {selectedCustomer ? (
            <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-2 text-sm font-semibold hover:text-slate-300">
              <ChevronLeft className="w-4 h-4" />
              <span>{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
            </button>
          ) : (
            <span className="text-sm font-semibold">Messages</span>
          )}
          <button onClick={() => { setOpen(false); setSelectedCustomer(null); }} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!selectedCustomer ? (
          <>
            {/* Search */}
            <div className="px-3 py-2 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <>
                  {filteredWithMessages.length === 0 && !search && (
                    <div className="p-6 text-center">
                      <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-xs">No conversations yet.</p>
                      <p className="text-slate-300 text-xs mt-0.5">Search to start a new one.</p>
                    </div>
                  )}

                  {filteredWithMessages.map(cust => {
                    const lastMsg = threads[cust.id];
                    const unread = unreadCounts[cust.id] || 0;
                    const initials = `${cust.first_name?.[0] || ""}${cust.last_name?.[0] || ""}`;
                    return (
                      <button
                        key={cust.id}
                        onClick={() => selectCustomer(cust)}
                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 border-b border-slate-100 text-left transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate ${unread > 0 ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                              {cust.first_name} {cust.last_name}
                            </p>
                            {lastMsg?.created_date && (
                              <span className="text-[10px] text-slate-400 ml-1 flex-shrink-0">
                                {formatDistanceToNow(new Date(lastMsg.created_date), { addSuffix: false }).replace("about ", "").replace(" minutes", "m").replace(" hours", "h").replace(" days", "d")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className={`text-[11px] truncate ${unread > 0 ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                              {lastMsg?.sender_type === "customer" ? "" : "You: "}{lastMsg?.message || ""}
                            </p>
                            {unread > 0 && (
                              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0 ml-1">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredOthers.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 bg-slate-50">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">New conversation</p>
                      </div>
                      {filteredOthers.map(cust => (
                        <button
                          key={cust.id}
                          onClick={() => selectCustomer(cust)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 text-left"
                        >
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold flex-shrink-0">
                            {cust.first_name?.[0]}{cust.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-700">{cust.first_name} {cust.last_name}</p>
                            <p className="text-[11px] text-slate-400">Start conversation</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              companyId={company?.id}
              customerId={selectedCustomer.id}
              senderType="technician"
              senderName={user?.full_name || "Team"}
              senderEmail={user?.email}
              onNewMessage={loadData}
            />
          </div>
        )}
      </div>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => { setOpen(false); setSelectedCustomer(null); }} />
      )}
    </>
  );
}