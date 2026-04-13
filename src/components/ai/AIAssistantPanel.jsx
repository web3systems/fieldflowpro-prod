import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  X, Mic, MicOff, Camera, CameraOff, Send, Bot, User,
  CheckCircle, Loader2, Video, VideoOff, RotateCcw
} from "lucide-react";

/**
 * AIAssistantPanel
 * mode: "job_notes" | "estimate"
 * context: { job, customer } or { estimate, customer }
 * onApplyNotes(text) — called with AI-generated note text
 * onApplyEstimate(lineItems) — called with [{description, quantity, unit_price, total, category}]
 * onClose()
 */
export default function AIAssistantPanel({ mode, context, onApplyNotes, onApplyEstimate, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [result, setResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Greet the user
    const greeting = mode === "estimate"
      ? "Hi! I'm here to help you build an estimate. You can describe the project by voice, show me photos or video, or type. What are we working on today?"
      : "Hi! I can help you create detailed job notes. Describe what you found on-site, capture photos, or use voice. What happened on this job?";
    setMessages([{ role: "assistant", content: greeting }]);
    return () => stopCamera();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Voice ----
  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice recognition is not supported in this browser."); return; }
    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = false;
    r.lang = "en-US";
    r.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(" ");
      setInput(prev => (prev ? prev + " " + transcript : transcript).trim());
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  }

  // ---- Camera ----
  async function toggleCamera() {
    if (cameraOn) { stopCamera(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch { alert("Could not access camera."); }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setLoading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCapturedImages(prev => [...prev, file_url]);
      setLoading(false);
    }, "image/jpeg", 0.85);
  }

  // ---- Send message ----
  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text && capturedImages.length === 0) return;

    const userMsg = {
      role: "user",
      content: text || "(shared an image)",
      images: capturedImages.length > 0 ? [...capturedImages] : undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setCapturedImages([]);
    setLoading(true);

    try {
      const res = await base44.functions.invoke("aiAssistant", {
        mode,
        context,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        file_urls: userMsg.images || [],
      });

      const { reply, result: aiResult } = res.data;
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (aiResult) setResult(aiResult);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    }
    setLoading(false);
  }

  function handleApply() {
    if (!result) return;
    if (mode === "estimate" && onApplyEstimate) onApplyEstimate(result.line_items || []);
    if (mode === "job_notes" && onApplyNotes) onApplyNotes(result.note || "");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="w-full sm:w-[600px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                {mode === "estimate" ? "AI Estimate Assistant" : "AI Job Notes Assistant"}
              </p>
              <p className="text-xs text-slate-400">Voice · Camera · Chat</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Preview */}
        {cameraOn && (
          <div className="relative bg-black flex-shrink-0">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-48 object-cover" />
            <button
              onClick={capturePhoto}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-4 border-violet-500 hover:bg-violet-50"
            >
              <Camera className="w-5 h-5 text-violet-600" />
            </button>
          </div>
        )}

        {/* Captured images preview */}
        {capturedImages.length > 0 && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0 border-b border-slate-100">
            {capturedImages.map((url, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                <button onClick={() => setCapturedImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "assistant" ? "bg-violet-100" : "bg-blue-100"
              }`}>
                {msg.role === "assistant"
                  ? <Bot className="w-3.5 h-3.5 text-violet-600" />
                  : <User className="w-3.5 h-3.5 text-blue-600" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-slate-100 text-slate-800 rounded-tl-sm"
                  : "bg-blue-600 text-white rounded-tr-sm"
              }`}>
                {msg.images?.map((url, j) => (
                  <img key={j} src={url} alt="" className="w-32 h-24 object-cover rounded-lg mb-2" />
                ))}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                <span className="text-sm text-slate-500">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Result Apply Banner */}
        {result && (
          <div className="mx-4 mb-2 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium truncate">
                {mode === "estimate"
                  ? `${result.line_items?.length || 0} line items ready to apply`
                  : "Note ready to apply"}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => setResult(null)} className="gap-1 text-xs border-green-300 text-green-700">
                <RotateCcw className="w-3 h-3" /> Revise
              </Button>
              <Button size="sm" onClick={handleApply} className="gap-1 text-xs bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-3 h-3" /> Apply
              </Button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex-shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={toggleVoice}
                className={`p-2.5 rounded-xl transition-colors ${
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600"
                }`}
                title={listening ? "Stop recording" : "Start voice recording"}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleCamera}
                className={`p-2.5 rounded-xl transition-colors ${
                  cameraOn
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600"
                }`}
                title={cameraOn ? "Close camera" : "Open camera"}
              >
                {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              </button>
            </div>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={listening ? "Listening... speak now" : "Type or use voice/camera..."}
              rows={1}
              className="flex-1 text-sm resize-none min-h-[40px] max-h-32"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || (!input.trim() && capturedImages.length === 0)}
              className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 text-center">
            {listening ? "🔴 Recording — speak clearly" : "Shift+Enter for new line · Enter to send"}
          </p>
        </div>
      </div>
    </div>
  );
}