import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { format } from "date-fns";

const WELCOME = "Hi! I'm your virtual assistant. I can help you book services, check on your jobs, or answer questions. What can I help you with?";

export default function AIChatBot({ customer, company }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: WELCOME, time: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input.trim(), time: new Date() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    // Save customer message to DB so staff can see it
    if (customer) {
      base44.entities.ChatMessage.create({
        company_id: company?.id || customer.company_id,
        customer_id: customer.id,
        sender_type: "customer",
        sender_name: `${customer.first_name} ${customer.last_name}`,
        sender_email: customer.email,
        message: userMsg.content,
        message_type: "text",
        is_read_by_customer: true,
        is_read_by_staff: false,
      });
    }

    try {
      const context = `You are a friendly customer service assistant for ${company?.name || "a home services company"} (${company?.industry || "home services"}).
You help customers: book services, check job statuses, understand invoices, and answer general questions.
Customer name: ${customer?.first_name} ${customer?.last_name}.
Keep responses concise and helpful. If they want to book, explain they can use the "Book" tab or you can help them request it.
If you can't answer something specific (like exact scheduling), tell them a team member will follow up.`;

      const conversationHistory = history.map(m => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`).join("\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${context}\n\nConversation:\n${conversationHistory}\n\nAssistant:`,
      });

      const aiReply = typeof result === "string" ? result : result?.response || "I'm here to help! Could you tell me more?";
      const aiMsg = { role: "assistant", content: aiReply, time: new Date() };
      setMessages(prev => [...prev, aiMsg]);

      // Save AI reply to DB for staff visibility
      if (customer) {
        base44.entities.ChatMessage.create({
          company_id: company?.id || customer.company_id,
          customer_id: customer.id,
          sender_type: "ai",
          sender_name: "AI Assistant",
          message: aiReply,
          message_type: "ai",
          is_read_by_customer: true,
          is_read_by_staff: false,
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble right now. A team member will follow up with you shortly.", time: new Date() }]);
    }
    setLoading(false);
  }

  const accentColor = company?.primary_color || "#2563eb";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-105"
        style={{ backgroundColor: accentColor }}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-40 right-4 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: accentColor }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{company?.name || "Assistant"}</p>
              <p className="text-white/70 text-xs">AI Support · Usually replies instantly</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-violet-600" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-white rounded-br-sm"
                    : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm"
                }`} style={msg.role === "user" ? { backgroundColor: accentColor } : {}}>
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3 h-3 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-violet-600" />
                </div>
                <div className="bg-white border border-slate-100 shadow-sm px-3 py-2 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t border-slate-200 p-2 flex gap-2 bg-white">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-slate-50"
              style={{ "--tw-ring-color": accentColor }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-colors text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}