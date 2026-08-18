import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Zap, Briefcase, Users, FileText, Sun, Send, DollarSign, Calculator, TrendingUp, Wrench, Calendar, Clock, MapPin, Bell, MessageCircle, Package, Camera, CheckSquare, BookOpen, BarChart3, Home, CreditCard, Megaphone, Phone, Hammer, PaintBucket, Trees, Snowflake, Leaf, Truck, ClipboardList, Target, Lightbulb, AlertTriangle, Star, MessageSquare } from "lucide-react";
import { buildHenryContext, getHenryVoiceConfig, getHenryOpeningQuestions, HENRY_ICON_MAP, HENRY_TIMEZONE, isJobScheduledOnDate } from "@/lib/henryBrain";
import { henryDecideAction, runHenryAction } from "@/lib/henryActions";

// Resolve lucide icon components by name from the shared map.
const HENRY_ICONS = {
  Sun, Briefcase, Zap, FileText, Wrench, DollarSign, Calculator, TrendingUp,
  Users, Calendar, Clock, MapPin, Bell, MessageCircle, Package, Camera,
  CheckSquare, BookOpen, BarChart3, Home, CreditCard, Megaphone, Phone,
  Hammer, PaintBucket, Trees, Snowflake, Leaf, Truck, ClipboardList, Target,
  Lightbulb, AlertTriangle, Star, Send, MessageSquare,
};

function resolveQuickActions(company) {
  return getHenryOpeningQuestions(company).map(q => ({
    ...q,
    icon: HENRY_ICONS[q.icon] || HENRY_ICON_MAP[q.icon] && HENRY_ICONS[HENRY_ICON_MAP[q.icon]] || MessageSquare,
  }));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// Resolve the chosen voice ONCE (when the voice list is available) and reuse
// that same SpeechSynthesisVoice object for every utterance. Calling
// getVoices() at speak-time is unreliable — Chrome returns [] right after
// cancel(), which drops Henry to the default voice. A voice object resolved
// before any cancel() stays valid across cancels.
let _henryVoice = null;
// Module-level guard: Henry should greet exactly once per page load, even if
// the component remounts (StrictMode double-invoke, layout re-renders, etc.).
let _henryHasGreeted = false;

function primeHenryVoice() {
  if (!window.speechSynthesis) return;
  const uri = localStorage.getItem("henry_voice_uri");
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return;
  if (uri) {
    const found = voices.find(v => v.voiceURI === uri);
    if (found) { _henryVoice = found; return; }
  }
  if (!_henryVoice) {
    // Male-voice fallback when no preference is set
    const maleNames = ['Google UK English Male', 'Microsoft David', 'Daniel', 'Alex', 'Ralph', 'Oliver', 'Arthur', 'Microsoft Guy', 'Google US English Male'];
    _henryVoice = voices.find(v => maleNames.some(n => v.name.includes(n))) ||
      voices.find(v => v.name.toLowerCase().includes('male')) ||
      voices.find(v => v.lang?.startsWith('en')) ||
      voices[0] || null;
  }
}

// Prime as early as possible (voices may already be cached by the browser).
if (typeof window !== "undefined" && window.speechSynthesis) {
  primeHenryVoice();
}

function speak(text, onEnd) {
  if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
  const run = () => {
    try {
      // Ensure the persisted voice is resolved before every utterance — voices
      // may load after the first render, so re-prime on demand.
      if (!_henryVoice) primeHenryVoice();
      const utt = new SpeechSynthesisUtterance(text);
      const cfg = getHenryVoiceConfig();
      utt.rate = cfg.rate;
      utt.pitch = cfg.pitch;
      if (_henryVoice) utt.voice = _henryVoice;
      if (onEnd) { utt.onend = onEnd; utt.onerror = onEnd; }
      window.speechSynthesis.speak(utt);
    } catch (e) {
      if (onEnd) onEnd();
    }
  };
  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      setTimeout(run, 0);
    } else {
      run();
    }
  } catch (e) {
    if (onEnd) onEnd();
  }
}

export default function Henry() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [weather, setWeather] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const initialized = useRef(false);
  const pendingActionRef = useRef(null);
  const handleCommandRef = useRef(null);

  const addMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  const henrySay = useCallback((text, onEnd) => {
    addMessage("henry", text);
    setIsSpeaking(true);
    let done = false;
    let safety;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(safety);
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    speak(text, finish);
    // Safety net: some browsers never fire onend (mobile Safari, Chrome cancel-then-speak).
    const estMs = Math.min(Math.max(4000, text.length * 70), 30000);
    safety = setTimeout(finish, estMs);
  }, [addMessage]);

  // Initialize on load
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      try {
        const u = await base44.auth.me();
        setUser(u);

        const [companyRes, weatherRes] = await Promise.all([
          base44.functions.invoke('getUserCompanies', {}).catch(() => null),
          base44.functions.invoke('getWeather', {}).catch(() => null),
        ]);

        const companies = companyRes?.data?.companies || [];
        const activeCompany = companies[0] || null;
        setCompany(activeCompany);
        if (weatherRes?.data) setWeather(weatherRes.data);

        const firstName = u?.full_name?.split(' ')[0] || 'there';
        const greeting = getGreeting();

        setTimeout(() => {
          if (_henryHasGreeted) return;
          _henryHasGreeted = true;
          henrySay(
            `Good ${greeting}, ${firstName}. I'm Henry, your field operations manager. How can I help you today? Say "morning briefing" to get started.`
          );
        }, 1000);
      } catch (e) {
        console.error('Henry init error:', e);
        setTimeout(() => {
          if (_henryHasGreeted) return;
          _henryHasGreeted = true;
          henrySay("Good day! I'm Henry, your field operations manager. How can I help you today?");
        }, 1000);
      }
    }

    // Resolve and cache the chosen voice once voices are available, then reuse
    // it for every utterance (see primeHenryVoice).
    if (window.speechSynthesis) {
      primeHenryVoice();
      window.speechSynthesis.onvoiceschanged = () => primeHenryVoice();
    }

    init();
  }, [henrySay]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recognition setup
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      henrySay("Sorry, your browser doesn't support voice recognition. Please try Chrome.");
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let processed = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      if (processed) return; // guard against Chrome firing multiple final results
      processed = true;
      const last = e.results.length - 1;
      const said = e.results[last][0].transcript.toLowerCase().trim();
      try { recognition.stop(); } catch (_) {}
      setTranscript(said);
      addMessage("user", said);
      handleCommandRef.current?.(said);
    };
    recognition.start();
  }, [henrySay, addMessage]);

  // Resolve the active company, re-fetching if it isn't loaded yet (race guard
  // for when the user speaks before init() finishes loading companies).
  const ensureCompany = useCallback(async () => {
    if (company?.id) return company;
    try {
      const res = await base44.functions.invoke('getUserCompanies', {});
      const list = res?.data?.companies || [];
      const saved = localStorage.getItem('activeCompanyId');
      const found = list.find(c => c.id === saved) || list[0] || null;
      if (found) setCompany(found);
      return found;
    } catch {
      return null;
    }
  }, [company]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleCommand = useCallback(async (cmd) => {
    setIsLoading(true);
    try {
      // 1) Handle a pending yes/no follow-up from a previous action
      if (pendingActionRef.current) {
        const pa = pendingActionRef.current;
        if (/\b(yes|yeah|yep|sure|do it|go ahead|please|confirm|ok|okay|yup)\b/i.test(cmd)) {
          pendingActionRef.current = null;
          await executePending(pa);
          return;
        }
        if (/\b(no|nope|nah|don't|do not|cancel|negative)\b/i.test(cmd)) {
          pendingActionRef.current = null;
          henrySay("No problem, I'll leave it as is. Anything else?");
          return;
        }
        // Not a yes/no → treat as a brand-new command; clear pending and continue
        pendingActionRef.current = null;
      }

      // 2) Fast-path keyword shortcuts (rich read-only briefings)
      if (cmd.includes('morning briefing') || cmd.includes('briefing')) {
        await doBriefing();
        return;
      }
      if (cmd.includes('open jobs') || cmd.includes("jobs today") || cmd.includes("today's jobs")) {
        await doOpenJobs();
        return;
      }

      // 3) General dispatcher: Henry decides to act or reply (LLM)
      const active = await ensureCompany();
      const ctx = await buildHenryContext(active, user);
      const decision = await henryDecideAction(cmd, ctx, active?.henry_training);
      henrySay(decision.text);
      if (decision.kind === 'action' && decision.action) {
        if (decision.confirm) {
          pendingActionRef.current = { action: decision.action, params: decision.params, company: active };
        } else {
          await executeAction(decision.action, decision.params, active);
        }
      }
    } catch (e) {
      henrySay("Sorry, I ran into an issue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [company, weather, henrySay, navigate, user]);

  // Keep the ref in sync so startListening (declared above handleCommand) can
  // call the latest handler without a forward const reference (TDZ-safe).
  useEffect(() => { handleCommandRef.current = handleCommand; }, [handleCommand]);

  async function doBriefing() {
    const active = await ensureCompany();
    const companyId = active?.id;
    const firstName = user?.full_name?.split(' ')[0] || 'there';
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: HENRY_TIMEZONE });

    // Fetch weather + jobs + dispatch suggestions in parallel
    const [weatherData, jobsData, dispatchData] = await Promise.all([
      weather
        ? Promise.resolve(weather)
        : base44.functions.invoke('getWeather', {}).then(r => r.data).catch(() => null),
      companyId
        ? base44.entities.Job.filter({ company_id: companyId }).catch(() => [])
        : Promise.resolve([]),
      companyId
        ? base44.functions.invoke('suggestDispatch', { company_id: companyId }).then(r => r.data).catch(() => null)
        : Promise.resolve(null),
    ]);

    const today = new Date().toLocaleDateString('en-CA', { timeZone: HENRY_TIMEZONE }); // Eastern YYYY-MM-DD
    const todayJobs = jobsData.filter(j =>
      isJobScheduledOnDate(j, today) &&
      ['scheduled', 'in_progress'].includes(j.status)
    );
    const inProgress = todayJobs.filter(j => j.status === 'in_progress');
    const unassigned = todayJobs.filter(j => !j.assigned_techs?.length);

    let briefing = `Good ${getGreeting()}, ${firstName}. Here's your briefing for ${dateStr}. `;

    if (weatherData) {
      briefing += `Weather in ${weatherData.city}: ${weatherData.temp}°F, ${weatherData.conditions}. Wind at ${weatherData.wind_speed} miles per hour. `;
      if (weatherData.alerts?.length) {
        briefing += `Alert: ${weatherData.alerts[0].event}. `;
      }
    }

    briefing += `You have ${todayJobs.length} job${todayJobs.length !== 1 ? 's' : ''} scheduled today. `;
    if (inProgress.length) briefing += `${inProgress.length} ${inProgress.length === 1 ? 'is' : 'are'} in progress. `;
    if (unassigned.length) briefing += `${unassigned.length} ${unassigned.length === 1 ? 'is' : 'are'} unassigned. `;

    const topJobs = todayJobs.slice(0, 3);
    if (topJobs.length) {
      briefing += `Top jobs: `;
      topJobs.forEach((j, i) => {
        const addr = [j.address, j.city].filter(Boolean).join(', ') || 'no address';
        briefing += `${i + 1}: ${j.title} at ${addr}. `;
      });
    }

    if (dispatchData?.suggestions?.length) {
      const s = dispatchData.suggestions[0];
      if (s.suggested_tech) {
        briefing += `I suggest dispatching ${s.suggested_tech.name} to ${s.address}. `;
      }
    }

    briefing += `What would you like to work on first?`;
    henrySay(briefing);
    if (weatherData) setWeather(weatherData);
  }

  async function doOpenJobs() {
    const active = await ensureCompany();
    const companyId = active?.id;
    if (!companyId) { henrySay("No company found. Please set up your company first."); return; }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: HENRY_TIMEZONE }); // Eastern YYYY-MM-DD
    const jobs = await base44.entities.Job.filter({ company_id: companyId }).catch(() => []);
    const todayJobs = jobs.filter(j =>
      isJobScheduledOnDate(j, today) &&
      ['scheduled', 'in_progress', 'new'].includes(j.status)
    );

    if (!todayJobs.length) {
      henrySay("You have no jobs scheduled for today. Would you like to create one?");
      return;
    }

    let response = `You have ${todayJobs.length} job${todayJobs.length !== 1 ? 's' : ''} today. `;
    todayJobs.slice(0, 5).forEach((j, i) => {
      const addr = [j.address, j.city].filter(Boolean).join(', ') || 'no address';
      response += `${i + 1}: ${j.title}, ${j.status.replace('_', ' ')}, at ${addr}. `;
    });
    henrySay(response);
  }

  // --- Action execution (driven by the henryActions registry) ---

  async function executeAction(name, params, activeCompany) {
    try {
      const result = await runHenryAction(name, params, { company: activeCompany, user, navigate });
      if (result?.reply) henrySay(result.reply);
      if (result?.followup) {
        pendingActionRef.current = { action: result.followup.action, params: result.followup.params, company: activeCompany };
        setTimeout(() => henrySay(result.followup.question), 700);
      }
    } catch (e) {
      henrySay("I ran into an issue performing that action.");
    }
  }

  async function executePending(pa) {
    await executeAction(pa.action, pa.params, pa.company);
  }

  const triggerQuickAction = useCallback((command) => {
    addMessage("user", command);
    handleCommand(command);
  }, [addMessage, handleCommand]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center px-4 py-8" style={{ background: '#0f172a' }}>

      {/* Henry Avatar */}
      <div className="flex flex-col items-center mb-6 mt-4">
        <div className="relative">
          <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-300 ${isSpeaking ? 'border-blue-400 shadow-blue-500/40' : 'border-slate-600'}`}
            style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}
          >
            <span className="text-5xl select-none">🤵</span>
          </div>
          {/* Status dot */}
          <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${isListening ? 'bg-green-400 animate-pulse' : isSpeaking ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
        </div>
        <h1 className="text-3xl font-bold text-white mt-4">Henry</h1>
        <p className="text-slate-400 text-sm mt-1">Your Field Operations Manager</p>
        {company && <p className="text-slate-500 text-xs mt-1">{company.name}</p>}
      </div>

      {/* Weather strip */}
      {weather && (
        <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-5 py-2 mb-6 text-sm text-slate-300">
          <Sun className="w-4 h-4 text-yellow-400" />
          <span>{weather.city}: {weather.temp}°F, {weather.conditions}</span>
          <span className="text-slate-500">· Wind {weather.wind_speed} mph</span>
        </div>
      )}

      {/* Transcript / conversation */}
      <div className="w-full max-w-2xl flex-1 mb-6 space-y-3 overflow-y-auto max-h-64 px-1">
        {messages.length === 0 && (
          <p className="text-center text-slate-600 text-sm py-8">Henry will greet you shortly…</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'henry'
                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100'
                : 'bg-slate-700 text-slate-200'
            }`}>
              {msg.role === 'henry' && <span className="text-blue-400 font-semibold text-xs block mb-1">Henry</span>}
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Mic button */}
      <div className="flex flex-col items-center mb-8">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isSpeaking || isLoading}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 focus:outline-none
            ${isListening
              ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/40'
              : isSpeaking || isLoading
              ? 'bg-slate-700 cursor-not-allowed opacity-60'
              : 'bg-blue-600 hover:bg-blue-500 hover:scale-105 shadow-blue-500/40'
            } ${isSpeaking ? 'animate-pulse' : ''}`}
        >
          {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
        </button>
        <p className="text-slate-500 text-xs mt-3">
          {isListening ? 'Listening… tap to stop' : isSpeaking ? 'Henry is speaking…' : isLoading ? 'Processing…' : 'Tap to speak'}
        </p>
      </div>

      {/* Quick actions */}
      <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-3">
        {resolveQuickActions(company).map(({ id, label, command, icon: Icon }) => (
          <button
            key={id || label}
            onClick={() => triggerQuickAction(command)}
            disabled={isListening || isLoading}
            className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/80 hover:border-blue-500/50 transition-all text-slate-300 hover:text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed ${isSpeaking ? 'animate-pulse' : ''}`}
          >
            <Icon className="w-5 h-5 text-blue-400" />
            {label}
          </button>
        ))}
      </div>

      {/* Text input */}
      <div className="w-full max-w-2xl mt-6 flex gap-2">
        <input
          type="text"
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && textInput.trim() && !isLoading) {
              const msg = textInput.trim();
              setTextInput("");
              addMessage("user", msg);
              handleCommand(msg);
            }
          }}
          disabled={isListening || isLoading}
          placeholder="Ask Henry anything…"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={() => {
            if (!textInput.trim() || isLoading) return;
            const msg = textInput.trim();
            setTextInput("");
            addMessage("user", msg);
            handleCommand(msg);
          }}
          disabled={!textInput.trim() || isLoading || isListening}
          className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Transcript debug strip */}
      {transcript && (
        <p className="mt-3 text-slate-600 text-xs text-center">Last heard: "{transcript}"</p>
      )}
    </div>
  );
}