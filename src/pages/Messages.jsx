import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { MessageCircle, Search, User, Circle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import ChatWindow from "@/components/chat/ChatWindow";

export default function Messages() {
  const { activeCompany, user } = useApp();
  const [customers, setCustomers] = useState([]);
  const [threads, setThreads] = useState({}); // customerId -> last message
  const [unreadCounts, setUnreadCounts] = useState({}); // customerId -> count
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  useEffect(() => {
    if (!activeCompany) return;
    const unsub = base44.entities.ChatMessage.subscribe(event => {
      if (event.data?.company_id === activeCompany.id) {
        const cid = event.data.customer_id;
        if (event.type === "create") {
          setThreads(prev => ({ ...prev, [cid]: event.data }));
          if (!event.data.is_read_by_staff) {
            setUnreadCounts(prev => ({ ...prev, [cid]: (prev[cid] || 0) + 1 }));
          }
        }
      }
    });
    return unsub;
  }, [activeCompany]);

  async function loadData() {
    setLoading(true);
    const [c, msgs] = await Promise.all([
      base44.entities.Customer.filter({ company_id: activeCompany.id }),
      base44.entities.ChatMessage.filter({ company_id: activeCompany.id }, "-created_date", 500),
    ]);
    setCustomers(c);

    // Build threads (last message per customer)
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

  const me = user;

  // Customers who have at least one message (active threads), plus all others for starting new
  const customersWithMessages = customers.filter(c => threads[c.id]);
  const otherCustomers = customers.filter(c => !threads[c.id]);

  const filteredWithMessages = customersWithMessages.filter(c =>
    !search || `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOthers = otherCustomers.filter(c =>
    search && `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelectCustomer(cust) {
    setSelectedCustomer(cust);
    setUnreadCounts(prev => ({ ...prev, [cust.id]: 0 }));
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left: Thread list */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white ${selectedCustomer ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-lg font-bold text-slate-900 mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <>
              {filteredWithMessages.length === 0 && !search && (
                <div className="p-8 text-center">
                  <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No messages yet.</p>
                  <p className="text-slate-400 text-xs mt-1">Search for a customer to start a conversation.</p>
                </div>
              )}

              {filteredWithMessages.map(cust => {
                const lastMsg = threads[cust.id];
                const unread = unreadCounts[cust.id] || 0;
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <button
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left ${isSelected ? "bg-blue-50" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {cust.first_name?.[0]}{cust.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${unread > 0 ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                          {cust.first_name} {cust.last_name}
                        </p>
                        {lastMsg?.created_date && (
                          <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(lastMsg.created_date), { addSuffix: false }).replace("about ", "")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-xs truncate ${unread > 0 ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                          {lastMsg?.sender_type !== "customer" ? "You: " : ""}{lastMsg?.message || ""}
                        </p>
                        {unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 ml-2">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Search results for customers without messages */}
              {filteredOthers.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Start new conversation</p>
                  </div>
                  {filteredOthers.map(cust => (
                    <button
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold flex-shrink-0">
                        {cust.first_name?.[0]}{cust.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{cust.first_name} {cust.last_name}</p>
                        <p className="text-xs text-slate-400">No messages yet</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Chat window */}
      <div className={`flex-1 flex flex-col bg-slate-50 ${selectedCustomer ? "flex" : "hidden md:flex"}`}>
        {!selectedCustomer ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Select a conversation</p>
              <p className="text-slate-300 text-sm mt-1">Choose a customer to start messaging</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="md:hidden text-slate-500 hover:text-slate-800 mr-1"
              >
                ←
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {selectedCustomer.first_name?.[0]}{selectedCustomer.last_name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                {selectedCustomer.phone && <p className="text-xs text-slate-400">{selectedCustomer.phone}</p>}
              </div>
            </div>

            <ChatWindow
              companyId={activeCompany?.id}
              customerId={selectedCustomer.id}
              senderType="technician"
              senderName={me?.full_name || "Team"}
              senderEmail={me?.email}
              onNewMessage={() => loadData()}
            />
          </>
        )}
      </div>
    </div>
  );
}