import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Mic, MicOff, Send, Sparkles, ClipboardList, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) || voices.find(v => v.lang.startsWith("en"));
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

export default function FieldTechAgent() {
  const { activeCompany } = useApp();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (activeCompany && !initialized.current) {
      initialized.current = true;
      initConversation();
    }
  }, [activeCompany]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initConversation() {
    const conv = await base44.agents.createConversation({
      agent_name: "field_tech_agent",
      metadata: { name: "Field Work Log" },
    });
    setConversationId(conv.id);
    base44.agents.subscribeToConversation(conv.id, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      setLoading(false);
      // Auto-speak last assistant message
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant" && voiceEnabled && last.content) {
        speak(last.content.replace(/\*\*/g, "").replace(/[#*`]/g, ""));
      }
    });
  }

  async function sendMessage(text) {
    const msg = text || input;
    if (!msg.trim() || !conversationId || loading) return;
    setInput("");
    setLoading(true);
    const conv = await base44.agents.getConversation(conversationId);
    await base44.agents.addMessage(conv, { role: "user", content: msg });
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported in this browser. Please use Chrome."); return; }
    window.speechSynthesis?.cancel();
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const said = e.results[0][0].transcript;
      sendMessage(said);
    };
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 flex-shrink-0">
        <Link to="/WorkLogs" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Work Logs</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Field Tech Assistant</p>
              <p className="text-slate-400 text-xs">Log your work with AI</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setVoiceEnabled(v => !v)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            voiceEnabled ? "border-green-500 text-green-400 bg-green-500/10" : "border-slate-600 text-slate-500"
          }`}
        >
          {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center py-16 text-slate-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-400">Starting your session...</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600 text-white rounded-tr-sm"
                : "bg-slate-700 text-slate-100 rounded-tl-sm"
            }`}>
              {msg.role === "assistant"
                ? <ReactMarkdown className="prose prose-sm prose-invert max-w-none">{msg.content || ""}</ReactMarkdown>
                : msg.content
              }
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700/50 flex-shrink-0">
        <div className="flex gap-2 items-center">
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              isListening
                ? "bg-red-500 shadow-lg shadow-red-500/40 scale-110"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-slate-300" />}
          </button>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? "Listening..." : "Type or hold mic to speak..."}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            disabled={loading || isListening}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 h-12 w-12 p-0 flex-shrink-0 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">Hold mic button to speak · Release to send</p>
      </div>
    </div>
  );
}