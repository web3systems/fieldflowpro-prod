import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, Plus, Loader2, TicketCheck, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";

const STATUS_COLORS = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting_customer: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-600",
};

function ChatBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
        isUser
          ? "bg-slate-800 text-white"
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

function AIChat({ user, activeCompany }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initConversation() {
    const conv = await base44.agents.createConversation({
      agent_name: "support_agent",
      metadata: { name: "Support Chat" },
    });
    setConversation(conv);
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

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-96">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 rounded-xl border border-slate-200">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Hi! I'm your FieldFlow Pro Support Agent.</p>
            <p className="text-sm mt-1">Ask me anything about using the platform.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          msg.content ? <ChatBubble key={i} message={msg} /> : null
        ))}
        {sending && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question or describe your issue..."
          className="flex-1"
          disabled={!conversation || sending}
        />
        <Button onClick={sendMessage} disabled={!input.trim() || !conversation || sending} className="gap-1.5">
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        The AI can create support tickets on your behalf for issues requiring human review.
      </p>
    </div>
  );
}

function NewTicketForm({ user, activeCompany, onCreated }) {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category: "other",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);
    await base44.entities.Ticket.create({
      ...form,
      company_id: activeCompany?.id || "",
      submitter_email: user?.email || "",
      submitter_name: user?.full_name || user?.email || "Unknown",
      status: "open",
      source: "portal",
    });
    setSubmitting(false);
    setDone(true);
    onCreated?.();
  }

  if (done) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <TicketCheck className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Ticket Submitted!</h3>
        <p className="text-slate-500 text-sm mb-6">Our support team will get back to you shortly.</p>
        <Button variant="outline" onClick={() => setDone(false)}>Submit Another</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 py-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Subject *</label>
        <Input
          value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
          placeholder="Brief description of your issue"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Description *</label>
        <Textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Describe your issue in detail — what you expected vs what happened..."
          rows={5}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Category</label>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="billing">Billing</option>
            <option value="technical">Technical</option>
            <option value="feature_request">Feature Request</option>
            <option value="account">Account</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Priority</label>
          <select
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={submitting || !form.subject.trim() || !form.description.trim()}
        className="w-full"
      >
        {submitting ? "Submitting..." : "Submit Ticket"}
      </Button>
    </div>
  );
}

function MyTickets({ user, activeCompany }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    load();
  }, [activeCompany?.id]);

  async function load() {
    setLoading(true);
    const t = await base44.entities.Ticket.filter(
      activeCompany?.id ? { company_id: activeCompany.id } : { submitter_email: user?.email }
    , "-created_date");
    setTickets(t);
    setLoading(false);
  }

  if (loading) return <div className="py-8 text-center text-slate-400 text-sm">Loading tickets...</div>;
  if (tickets.length === 0) return (
    <div className="py-12 text-center text-slate-400 text-sm">
      <TicketCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
      No tickets yet.
    </div>
  );

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">
          ← Back to tickets
        </button>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{selected.subject}</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Submitted {new Date(selected.created_date).toLocaleDateString()}</p>
              </div>
              <Badge className={STATUS_COLORS[selected.status] || "bg-slate-100 text-slate-600"}>
                {selected.status?.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">{selected.description}</div>
            {selected.responses?.map((r, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm ${r.is_from_support ? "bg-blue-50 border border-blue-100" : "bg-slate-100"}`}>
                <p className="font-medium text-xs text-slate-500 mb-1">{r.sender_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                <p className="text-slate-700">{r.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map(t => (
        <button
          key={t.id}
          onClick={() => setSelected(t)}
          className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-slate-800 truncate">{t.subject}</p>
            <p className="text-xs text-slate-400 mt-0.5">{new Date(t.created_date).toLocaleDateString()} · {t.category}</p>
          </div>
          <Badge className={STATUS_COLORS[t.status] || "bg-slate-100 text-slate-600"}>
            {t.status?.replace("_", " ")}
          </Badge>
          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

export default function Support() {
  const { activeCompany } = useApp();
  const [user, setUser] = useState(null);
  const [ticketRefresh, setTicketRefresh] = useState(0);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-20 lg:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Support</h1>
        <p className="text-slate-500 text-sm mt-0.5">Get help from our AI agent or submit a ticket for human review.</p>
      </div>

      <Tabs defaultValue="chat">
        <TabsList className="mb-6">
          <TabsTrigger value="chat" className="gap-2">
            <MessageCircle className="w-4 h-4" /> AI Chat Support
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <Plus className="w-4 h-4" /> New Ticket
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2">
            <TicketCheck className="w-4 h-4" /> My Tickets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <AIChat user={user} activeCompany={activeCompany} />
        </TabsContent>

        <TabsContent value="new">
          <NewTicketForm
            user={user}
            activeCompany={activeCompany}
            onCreated={() => setTicketRefresh(r => r + 1)}
          />
        </TabsContent>

        <TabsContent value="tickets">
          <MyTickets key={ticketRefresh} user={user} activeCompany={activeCompany} />
        </TabsContent>
      </Tabs>
    </div>
  );
}