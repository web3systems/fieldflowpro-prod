import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Bot, User } from "lucide-react";
import { format } from "date-fns";

export default function ChatWindow({ companyId, customerId, senderType, senderName, senderEmail, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!companyId || !customerId) return;
    loadMessages();
    const unsub = base44.entities.ChatMessage.subscribe(event => {
      if (event.data?.company_id === companyId && event.data?.customer_id === customerId) {
        setMessages(prev => {
          if (event.type === "create") return [...prev, event.data];
          if (event.type === "update") return prev.map(m => m.id === event.id ? event.data : m);
          if (event.type === "delete") return prev.filter(m => m.id !== event.id);
          return prev;
        });
      }
    });
    // Mark as read
    markRead();
    return unsub;
  }, [companyId, customerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    const msgs = await base44.entities.ChatMessage.filter(
      { company_id: companyId, customer_id: customerId },
      "created_date",
      100
    );
    setMessages(msgs);
  }

  async function markRead() {
    if (senderType === "customer") {
      const unread = await base44.entities.ChatMessage.filter({ company_id: companyId, customer_id: customerId, is_read_by_customer: false });
      unread.forEach(m => base44.entities.ChatMessage.update(m.id, { is_read_by_customer: true }));
    } else {
      const unread = await base44.entities.ChatMessage.filter({ company_id: companyId, customer_id: customerId, is_read_by_staff: false });
      unread.forEach(m => base44.entities.ChatMessage.update(m.id, { is_read_by_staff: true }));
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const msg = {
      company_id: companyId,
      customer_id: customerId,
      sender_type: senderType,
      sender_name: senderName,
      sender_email: senderEmail,
      message: text.trim(),
      message_type: "text",
      is_read_by_staff: senderType !== "customer",
      is_read_by_customer: senderType === "customer",
    };
    await base44.entities.ChatMessage.create(msg);
    setText("");
    setSending(false);
    onNewMessage?.();
  }

  const grouped = messages.reduce((acc, msg) => {
    const day = msg.created_date ? format(new Date(msg.created_date), "MMMM d, yyyy") : "Today";
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-8">
            No messages yet. Start the conversation!
          </div>
        )}
        {Object.entries(grouped).map(([day, dayMsgs]) => (
          <div key={day}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">{day}</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            {dayMsgs.map(msg => {
              const isMe = msg.sender_type === senderType;
              const isAI = msg.sender_type === "ai";
              const isSystem = msg.sender_type === "system_event";

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center">
                    <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{msg.message}</span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                  {!isMe && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isAI ? "bg-violet-100" : "bg-blue-100"}`}>
                      {isAI ? <Bot className="w-3.5 h-3.5 text-violet-600" /> : <User className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!isMe && (
                      <span className="text-xs text-slate-400 ml-1">
                        {isAI ? "AI Assistant" : (msg.sender_name || "Team")}
                      </span>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : isAI
                        ? "bg-violet-50 text-violet-900 border border-violet-100 rounded-bl-sm"
                        : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm"
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-xs text-slate-300 px-1">
                      {msg.created_date ? format(new Date(msg.created_date), "h:mm a") : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-slate-200 p-3 flex gap-2 bg-white">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}