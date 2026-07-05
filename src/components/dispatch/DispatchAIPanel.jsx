import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";

export default function DispatchAIPanel({ onClose }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function init() {
    const conv = await base44.agents.createConversation({
      agent_name: "dispatch_agent",
      metadata: { name: "Dispatch Session" },
    });
    setConversationId(conv.id);
    const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });
    return unsubscribe;
  }

  async function sendMessage() {
    if (!input.trim() || !conversationId || loading) return;
    const conv = await base44.agents.getConversation(conversationId);
    setLoading(true);
    const text = input;
    setInput("");
    await base44.agents.addMessage(conv, { role: "user", content: text });
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ height: "min(90vh, 600px)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">AI Dispatch Assistant</p>
              <p className="text-xs text-slate-400">Powered by FieldFlow AI</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Bot className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Ask me to help assign jobs to technicians.</p>
              <p className="text-xs mt-1 text-slate-300">e.g. "Who should I send to the urgent fence job?"</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-slate-100 text-slate-800 rounded-tl-sm"
              }`}>
                {msg.role === "assistant"
                  ? <ReactMarkdown className="prose prose-sm max-w-none">{msg.content}</ReactMarkdown>
                  : msg.content
                }
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t flex gap-2 flex-shrink-0">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about job assignments..."
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-violet-600 hover:bg-violet-700 flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}