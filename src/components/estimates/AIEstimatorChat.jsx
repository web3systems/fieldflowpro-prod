import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";

export default function AIEstimatorChat({ customers, services, company, onEstimateReady }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI Estimator. I'll help you build a professional estimate by asking a few questions.\n\nLet's start — what type of job is this? (e.g. bathroom renovation, deck repair, drywall patching, painting, plumbing, etc.)"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const serviceList = services.map(s => `${s.name} ($${s.unit_price}/${s.unit})`).join(", ");
    const customerList = customers.map(c => `${c.first_name} ${c.last_name} (id: ${c.id})`).join(", ");

    const systemPrompt = `You are an AI estimator assistant for a handyman/field service company called "${company?.name || "the company"}".

Your job is to chat with the technician and gather all information needed to build a professional estimate. Ask follow-up questions naturally — one or two at a time — until you have enough info.

Key things to gather:
- Job type / description
- Location / property details
- Scope of work (what needs to be done)
- Materials needed
- Estimated hours of labor
- Customer (who is this for)
- Any special considerations

Available services/pricing catalog: ${serviceList || "none on file"}
Available customers: ${customerList || "none on file"}

Once you have enough info to build a complete estimate, respond with ONLY a JSON block (no other text) in this exact format:
\`\`\`estimate_ready
{
  "title": "Job title",
  "customer_id": "customer id from list or null",
  "notes": "any notes",
  "line_items": [
    { "description": "Labor - description", "quantity": 2, "unit_price": 75, "total": 150, "service_id": null },
    { "description": "Materials - description", "quantity": 1, "unit_price": 50, "total": 50, "service_id": null }
  ],
  "subtotal": 200,
  "tax_rate": 0,
  "tax_amount": 0,
  "discount": 0,
  "total": 200,
  "summary": "One sentence summary of what was built"
}
\`\`\`

Until you have enough information, keep asking questions naturally and helpfully. Do NOT output the JSON block until you are confident you have everything needed.`;

    // Build full prompt with system context
    const fullPrompt = systemPrompt + "\n\nConversation so far:\n" +
      newMessages.map(m => `${m.role === "user" ? "Technician" : "AI"}: ${m.content}`).join("\n\n") +
      "\n\nAI:";

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      model: "claude_sonnet_4_6",
    });

    const assistantMsg = { role: "assistant", content: aiResponse };
    setMessages(prev => [...prev, assistantMsg]);

    // Check if the AI returned an estimate_ready block
    const match = aiResponse.match(/```estimate_ready\n([\s\S]*?)\n```/);
    if (match) {
      try {
        const estimateData = JSON.parse(match[1]);
        onEstimateReady(estimateData);
      } catch (e) {
        // JSON parse failed, keep chatting
      }
    }

    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "assistant" ? "bg-purple-100" : "bg-blue-100"
            }`}>
              {msg.role === "assistant"
                ? <Bot className="w-4 h-4 text-purple-600" />
                : <User className="w-4 h-4 text-blue-600" />
              }
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "assistant"
                ? "bg-white border border-slate-200 text-slate-800 shadow-sm"
                : "bg-blue-600 text-white"
            }`}>
              {msg.role === "assistant" && msg.content.includes("```estimate_ready")
                ? msg.content.replace(/```estimate_ready[\s\S]*?```/g, "").trim() || "✅ Estimate is ready for your review!"
                : msg.content
              }
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-purple-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the job, answer questions... (Enter to send)"
            rows={2}
            className="resize-none text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 h-10 px-3 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AI will ask questions until it has everything needed to build your estimate
        </p>
      </div>
    </div>
  );
}