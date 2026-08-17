import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Zap, Briefcase, Users, FileText, Sun, Send, DollarSign, Calculator, TrendingUp, Wrench } from "lucide-react";
import { henryAsk, buildHenryContext, getHenryVoiceConfig } from "@/lib/henryBrain";

const QUICK_ACTIONS = [
  { label: "Morning Briefing", command: "morning briefing", icon: Sun },
  { label: "Today's Jobs", command: "open jobs", icon: Briefcase },
  { label: "Dispatch a Tech", command: "dispatch", icon: Zap },
  { label: "Create Estimate", command: "create estimate", icon: FileText },
  { label: "Price a Repair", command: "price a repair job", icon: Wrench },
  { label: "Profit & Cash Flow", command: "profit and cash flow check", icon: DollarSign },
  { label: "Reconcile Books", command: "reconcile my books", icon: Calculator },
  { label: "Growth Strategy", command: "growth strategy", icon: TrendingUp },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function speak(text, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  const cfg = getHenryVoiceConfig();
  utt.rate = cfg.rate;
  utt.pitch = cfg.pitch;
  if (cfg.voice) {
    utt.voice = cfg.voice;
  } else {
    // Fallback: prefer a male voice if no explicit selection
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
          henrySay(
            `Good ${greeting}, ${firstName}. I'm Henry, your field operations manager. How can I help you today? Say "morning briefing" to get started.`
          );
        }, 1000);
      } catch (e) {
        console.error('Henry init error:', e);
        setTimeout(() => {
          henrySay("Good day! I'm Henry, your field operations manager. How can I help you today?");
        }, 1000);
      }
    }

    // Load voices async (Chrome requires this)
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
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
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const said = e.results[0][0].transcript.toLowerCase().trim();
      setTranscript(said);
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
      if (cmd.includes('morning briefing') || cmd.includes('briefing')) {
        await doBriefing();
      } else if (cmd.includes('open jobs') || cmd.includes('jobs today') || cmd.includes('jobs')) {
        await doOpenJobs();
      } else if (cmd.includes('dispatch')) {
        henrySay("Who would you like to dispatch? Please say the technician's name.");
      } else if (cmd.includes('create estimate') || cmd.includes('estimate')) {
        henrySay("Navigating to estimates now.", () => navigate('/NewEstimate'));
      } else if (cmd.includes('customers')) {
        henrySay("Opening customers.", () => navigate('/Customers'));
      } else if (cmd.includes('invoices')) {
        henrySay("Opening invoices.", () => navigate('/Invoices'));
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
    const firstName = user?.full_name?.split(' ')[0] || 'there';
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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

    const today = new Date().toISOString().split('T')[0];
    const todayJobs = jobsData.filter(j =>
      j.scheduled_start?.startsWith(today) &&
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
    const companyId = company?.id;
    if (!companyId) { henrySay("No company found. Please set up your company first."); return; }

    const today = new Date().toISOString().split('T')[0];
    const jobs = await base44.entities.Job.filter({ company_id: companyId }).catch(() => []);
    const todayJobs = jobs.filter(j =>
      j.scheduled_start?.startsWith(today) &&
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
        {QUICK_ACTIONS.map(({ label, command, icon: Icon }) => (
          <button
            key={label}
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