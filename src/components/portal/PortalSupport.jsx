import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Loader2, Headphones } from "lucide-react";
import ReactMarkdown from "react-markdown";

function ChatBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Headphones className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
        isUser
          ? "bg-green-600 text-white"
          : "bg-white border border-slate-200 text-slate-800"
      }`}>
        {isUser ? (
          <p className="leading-relaxed">{message.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function PortalSupport({ customer, company }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initConversation() {
    const conv = await base44.agents.createConversation({
      agent_name: "customer_support_agent",
      metadata: { name: "Customer Support" },
    });
    setConversation(conv);
    setStarted(true);
    const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }

  async function sendMessage() {
    if (!input.trim() || !conversation || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    await base44.agents.addMessage(conversation, { role: "user", content: text });
    setSending(false);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Headphones className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Need Help?</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-sm">
          I'm here to help with any questions about your estimates, invoices, jobs, or account.
          If I can't help, I'll open a support ticket for you.
        </p>
        <Button onClick={initConversation} className="gap-2 bg-green-600 hover:bg-green-700">
          <MessageCircle className="w-4 h-4" /> Start Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(var(--app-vh) - 180px)", minHeight: "400px" }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 rounded-xl border border-slate-200">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Headphones className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Hi! I'm your support assistant.</p>
            <p className="text-sm mt-1">How can I help you today?</p>
          </div>
        )}
        {messages.map((msg, i) => (
          msg.content ? <ChatBubble key={i} message={msg} /> : null
        ))}
        {sending && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mt-3">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your account, estimates, or invoices..."
          className="flex-1"
          disabled={!conversation || sending}
        />
        <Button onClick={sendMessage} disabled={!input.trim() || !conversation || sending} className="gap-1.5 bg-green-600 hover:bg-green-700">
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        I can open a support ticket if I can't resolve your question.
      </p>
    </div>
  );
}