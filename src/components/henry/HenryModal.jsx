import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { X, Mic, MicOff, Zap, Briefcase, FileText, Sun, DollarSign, Calculator, TrendingUp, Wrench, Send } from "lucide-react";
import { henryAsk, buildHenryContext, getHenryVoiceConfig } from "@/lib/henryBrain";

const QUICK_ACTIONS = [
  { label: "Briefing", command: "morning briefing", icon: Sun },
  { label: "Today's Jobs", command: "open jobs", icon: Briefcase },
  { label: "Dispatch", command: "dispatch", icon: Zap },
  { label: "Estimate", command: "create estimate", icon: FileText },
  { label: "Price a Repair", command: "price a repair job", icon: Wrench },
  { label: "Profit & Cash", command: "profit and cash flow check", icon: DollarSign },
  { label: "Reconcile Books", command: "reconcile my books", icon: Calculator },
  { label: "Growth", command: "growth strategy", icon: TrendingUp },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function speak(text, onEnd) {
  if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  const cfg = getHenryVoiceConfig();
  utt.rate = cfg.rate;
  utt.pitch = cfg.pitch;
  if (cfg.voice) {
    utt.voice = cfg.voice;
  } else {
    const voices = window.speechSynthesis.getVoices();
    const maleNames = ['Google UK English Male', 'Microsoft David', 'Daniel', 'Alex', 'Ralph', 'Oliver', 'Arthur', 'Microsoft Guy', 'Google US English Male'];
    const preferred = voices.find(v => maleNames.some(n => v.name.includes(n))) ||
      voices.find(v => v.name.toLowerCase().includes('male')) ||
      voices.find(v => v.lang?.startsWith('en')) ||
      voices[0];
    if (preferred) utt.voice = preferred;
  }
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

export default function HenryModal({ onClose, company, user }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const initialized = useRef(false);

  const addMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  const henrySay = useCallback((text, onEnd) => {
    addMessage("henry", text);
    setIsSpeaking(true);
    speak(text, () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    });
  }, [addMessage]);

  // Greet on open
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    const firstName = user?.full_name?.split(' ')[0] || 'there';
    setTimeout(() => {
      henrySay(`Good ${getGreeting()}, ${firstName}. I'm Henry, your field operations manager. What would you like to work on today?`);
    }, 400);
  }, [henrySay, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleClose() {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    onClose();
  }

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      henrySay("Sorry, your browser doesn't support voice recognition. Please try Chrome.");
      return;
    }
    recognitionRef.current?.stop();
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const said = e.results[0][0].transcript.toLowerCase().trim();
      addMessage("user", said);
      handleCommand(said);
    };
    recognition.start();
  }, [henrySay, addMessage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleCommand = useCallback(async (cmd) => {
    setIsLoading(true);
    try {
      if (cmd.includes('briefing') || cmd.includes('morning')) {
        await doBriefing();
      } else if (cmd.includes('open jobs') || cmd.includes('jobs today') || cmd.includes('jobs')) {
        await doOpenJobs();
      } else if (cmd.includes('dispatch')) {
        henrySay("Sure. Who would you like to dispatch? Please say the technician's name.");
      } else if (cmd.includes('create estimate') || cmd.includes('estimate')) {
        henrySay("Opening estimates now.", () => { handleClose(); navigate('/Estimates'); });
      } else if (cmd.includes('customers')) {
        henrySay("Opening customers.", () => { handleClose(); navigate('/Customers'); });
      } else if (cmd.includes('invoices')) {
        henrySay("Opening invoices.", () => { handleClose(); navigate('/Invoices'); });
      } else {
        // Free-form question → route to Henry's trained brain (LLM)
        const ctx = await buildHenryContext(company, user);
        const reply = await henryAsk(cmd, ctx, company?.henry_training);
        henrySay(reply);
      }
    } catch (e) {
      henrySay("Sorry, I ran into an issue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [company, weather, henrySay, navigate, user]);

  async function doBriefing() {
    const companyId = company?.id;
    if (!companyId) { henrySay("No company found. Please set up your company first."); return; }

    const allJobs = await base44.entities.Job.filter({ company_id: companyId }).catch(() => []);
    const activeJobs = allJobs.filter(j => ['in_progress', 'scheduled', 'new'].includes(j.status));

    const inProgress = activeJobs.filter(j => j.status === 'in_progress');
    const scheduled = activeJobs.filter(j => j.status === 'scheduled');
    const newJobs = activeJobs.filter(j => j.status === 'new');

    const total = activeJobs.length;
    const companyName = company?.name || 'your crew';

    const spokenBriefing = `Good morning. Here's your field overview. You have ${total} active job${total !== 1 ? 's' : ''} across ${companyName}. ${inProgress.length} are currently in progress, ${scheduled.length} are scheduled, and ${newJobs.length} are new and need attention. Which job would you like to act on? You can say dispatch, create estimate, or view customers.`;

    // Build display cards (in_progress first, then scheduled, then new)
    const ordered = [...inProgress, ...scheduled, ...newJobs];
    const jobLines = ordered.slice(0, 8).map(j => {
      const techLabel = j.assigned_techs?.length ? `Tech ID: ${j.assigned_techs[0].slice(-4)}` : 'Unassigned';
      const dateLabel = j.scheduled_start ? new Date(j.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      return `• ${j.title} [${j.status.replace('_', ' ')}] — ${techLabel}${dateLabel ? ' · ' + dateLabel : ''}`;
    }).join('\n');

    addMessage("henry", `Good morning. Here's your field overview:\n\n${total} active jobs across ${companyName}\n• ${inProgress.length} in progress\n• ${scheduled.length} scheduled\n• ${newJobs.length} new / needs attention\n\n${jobLines}\n\nWhich job would you like to act on? You can say dispatch, create estimate, or view customers.`);
    setIsSpeaking(true);
    speak(spokenBriefing, () => setIsSpeaking(false));
  }

  async function doOpenJobs() {
    if (!company?.id) { henrySay("No company found. Please set up your company first."); return; }
    const allJobs = await base44.entities.Job.filter({ company_id: company.id }).catch(() => []);
    const activeJobs = allJobs.filter(j => ['in_progress', 'scheduled', 'new'].includes(j.status));

    if (!activeJobs.length) {
      henrySay("You have no active jobs right now. Would you like to create one?");
      return;
    }

    const inProgress = activeJobs.filter(j => j.status === 'in_progress');
    const scheduled = activeJobs.filter(j => j.status === 'scheduled');
    const newJobs = activeJobs.filter(j => j.status === 'new');
    const ordered = [...inProgress, ...scheduled, ...newJobs];

    let spoken = `You have ${activeJobs.length} active job${activeJobs.length !== 1 ? 's' : ''}. `;
    ordered.slice(0, 5).forEach((j, i) => {
      spoken += `${i + 1}: ${j.title}, ${j.status.replace('_', ' ')}. `;
    });

    const jobLines = ordered.slice(0, 8).map(j => {
      const techLabel = j.assigned_techs?.length ? `Tech ID: ${j.assigned_techs[0].slice(-4)}` : 'Unassigned';
      const dateLabel = j.scheduled_start ? new Date(j.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      return `• ${j.title} [${j.status.replace('_', ' ')}] — ${techLabel}${dateLabel ? ' · ' + dateLabel : ''}`;
    }).join('\n');

    addMessage("henry", `${activeJobs.length} active job${activeJobs.length !== 1 ? 's' : ''}:\n\n${jobLines}`);
    setIsSpeaking(true);
    speak(spoken, () => setIsSpeaking(false));
  }

  const triggerQuickAction = useCallback((command) => {
    addMessage("user", command);
    handleCommand(command);
  }, [addMessage, handleCommand]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-lg flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#0f172a', maxHeight: '90vh', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header / Avatar */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6" style={{ background: 'linear-gradient(180deg, #0f1f3d 0%, #0f172a 100%)' }}>
          <div className="relative mb-4">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${isSpeaking ? 'ring-4 ring-amber-400/60 scale-105' : 'ring-2 ring-slate-600'}`}
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
            >
              <span className="text-amber-400 text-3xl font-black">H</span>
            </div>
            {/* Status dot */}
            <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 transition-colors duration-300 ${
              isListening ? 'bg-green-400 animate-pulse border-slate-900' :
              isSpeaking ? 'bg-amber-400 animate-pulse border-slate-900' :
              'bg-green-400 border-slate-900'
            }`} />
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tight">Henry</h2>
          <p className="text-slate-400 text-sm mt-0.5">Field Operations Manager</p>
          {weather && (
            <div className="flex items-center gap-2 mt-3 bg-slate-800/60 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>{weather.city}: {weather.temp}°F · {weather.conditions}</span>
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0" style={{ maxHeight: '280px' }}>
          {messages.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-6">Henry is ready…</p>
          ) : messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'henry'
                  ? 'text-slate-100 rounded-tl-sm'
                  : 'text-slate-200 rounded-tr-sm'
              }`}
              style={msg.role === 'henry'
                ? { background: 'rgba(37, 99, 235, 0.18)', border: '1px solid rgba(59, 130, 246, 0.25)' }
                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }
              }>
                {msg.role === 'henry' && (
                  <span className="text-amber-400 font-semibold text-xs block mb-1">Henry</span>
                )}
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2 px-5 pb-4">
          {QUICK_ACTIONS.map(({ label, command, icon: Icon }) => (
            <button
              key={label}
              onClick={() => triggerQuickAction(command)}
              disabled={isListening || isLoading || isSpeaking}
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700/60"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Icon className="w-4 h-4 text-amber-400" />
              <span className="text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {/* Mic */}
        <div className="flex flex-col items-center pb-8 pt-2">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking || isLoading}
            className={`w-18 h-18 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 focus:outline-none active:scale-95 ${
              isListening
                ? 'scale-110 shadow-red-500/40'
                : isSpeaking || isLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 shadow-blue-500/30'
            }`}
            style={{
              width: '72px',
              height: '72px',
              background: isListening
                ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
            }}
          >
            {isListening
              ? <MicOff className="w-7 h-7 text-white" />
              : <Mic className="w-7 h-7 text-white" />
            }
          </button>
          <p className="text-slate-500 text-xs mt-3 h-4">
            {isListening ? 'Listening… tap to stop' :
             isSpeaking ? 'Henry is speaking…' :
             isLoading ? 'Processing…' :
             'Tap to speak or type below'}
          </p>
          {/* Free-text chat — no opening question required */}
          <div className="w-full max-w-sm mt-4 flex gap-2 px-1">
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && textInput.trim() && !isLoading && !isSpeaking) {
                  const msg = textInput.trim();
                  setTextInput("");
                  addMessage("user", msg);
                  handleCommand(msg);
                }
              }}
              disabled={isListening || isLoading}
              placeholder="Ask Henry anything…"
              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              onClick={() => {
                if (!textInput.trim() || isLoading || isSpeaking) return;
                const msg = textInput.trim();
                setTextInput("");
                addMessage("user", msg);
                handleCommand(msg);
              }}
              disabled={!textInput.trim() || isLoading || isSpeaking || isListening}
              className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}