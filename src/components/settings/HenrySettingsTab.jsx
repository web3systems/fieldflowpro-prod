import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Mic, Save, CheckCircle, Play, Volume2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const DEFAULT_PREVIEW = "Hey, this is Henry. I'm ready to help you run a tighter, more profitable operation.";

export default function HenrySettingsTab({ company, onSaved }) {
  const [training, setTraining] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => localStorage.getItem("henry_voice_uri") || "");
  const [pitch, setPitch] = useState(() => parseFloat(localStorage.getItem("henry_pitch") || "0.82"));
  const [rate, setRate] = useState(() => parseFloat(localStorage.getItem("henry_rate") || "0.9"));
  const previewRef = useRef(training);

  useEffect(() => {
    if (company?.henry_training !== undefined) setTraining(company.henry_training || "");
  }, [company?.id, company?.henry_training]);

  useEffect(() => { previewRef.current = training; }, [training]);

  useEffect(() => {
    function loadVoices() {
      if (!window.speechSynthesis) return;
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      // If no selection yet, default to a male-ish voice if available
      if (!localStorage.getItem("henry_voice_uri") && v.length) {
        const male = v.find(x => /Google UK English Male|Microsoft David|Daniel|Alex|Ralph|Oliver|Arthur/i.test(x.name)) ||
          v.find(x => /male/i.test(x.name)) ||
          v.find(x => x.lang?.startsWith("en"));
        if (male) {
          localStorage.setItem("henry_voice_uri", male.voiceURI);
          setSelectedVoiceURI(male.voiceURI);
        }
      }
    }
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  function pickVoice(uri) {
    setSelectedVoiceURI(uri);
    localStorage.setItem("henry_voice_uri", uri);
  }

  function changePitch(v) {
    setPitch(v);
    localStorage.setItem("henry_pitch", String(v));
  }

  function changeRate(v) {
    setRate(v);
    localStorage.setItem("henry_rate", String(v));
  }

  function previewVoice() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(DEFAULT_PREVIEW);
    utt.pitch = pitch;
    utt.rate = rate;
    const v = voices.find(x => x.voiceURI === selectedVoiceURI);
    if (v) utt.voice = v;
    window.speechSynthesis.speak(utt);
  }

  function resetVoice() {
    localStorage.removeItem("henry_voice_uri");
    localStorage.removeItem("henry_pitch");
    localStorage.removeItem("henry_rate");
    setSelectedVoiceURI("");
    setPitch(0.82);
    setRate(0.9);
  }

  async function saveTraining() {
    setSaving(true);
    try {
      await base44.entities.Company.update(company.id, { henry_training: training });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  // Group voices by language for the menu
  const englishVoices = voices.filter(v => v.lang?.startsWith("en"));
  const otherVoices = voices.filter(v => !v.lang?.startsWith("en"));
  const sortedEnglish = [...englishVoices].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      {/* Training */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Mic className="w-4 h-4 text-blue-600" />Henry AI — Custom Training</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Add company-specific knowledge, processes, tone, pricing rules, or policies. Henry will use this as extra instructions on top of his built-in expertise (master handyman, bookkeeper, CPA, CEO).
          </p>
          <Textarea
            value={training}
            onChange={e => setTraining(e.target.value)}
            placeholder={"e.g.\n- Always confirm deposits are collected before scheduling.\n- Our warranty is 1 year on labor, manufacturer warranty on materials.\n- Refer to Tim for any discount over 10%.\n- Use a friendly, no-nonsense Vermont tone."}
            className="min-h-[180px] font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{training.length} characters</span>
            <Button onClick={saveTraining} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {saved ? <><CheckCircle className="w-4 h-4" />Saved!</> : saving ? "Saving..." : <><Save className="w-4 h-4" />Save Training</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voice */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Volume2 className="w-4 h-4 text-blue-600" />Henry's Voice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            Pick a voice from your device's available options. Male voices are listed first. These are the voices installed on this browser/device.
          </p>

          <div>
            <Label className="mb-1.5 block">Voice</Label>
            <Select value={selectedVoiceURI} onValueChange={pickVoice}>
              <SelectTrigger><SelectValue placeholder="Select a voice" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {sortedEnglish.map(v => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>
                    {v.name} {v.lang ? `(${v.lang})` : ""}
                  </SelectItem>
                ))}
                {otherVoices.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">Other languages</div>
                    {otherVoices.map(v => (
                      <SelectItem key={v.voiceURI} value={v.voiceURI}>
                        {v.name} {v.lang ? `(${v.lang})` : ""}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Pitch ({pitch.toFixed(2)})</Label>
              <input
                type="range" min="0" max="2" step="0.01" value={pitch}
                onChange={e => changePitch(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-[11px] text-slate-400">Lower = deeper/more masculine</p>
            </div>
            <div>
              <Label className="mb-1.5 block">Speed ({rate.toFixed(2)}x)</Label>
              <input
                type="range" min="0.5" max="1.5" step="0.01" value={rate}
                onChange={e => changeRate(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-[11px] text-slate-400">Normal speech is around 1.0x</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={previewVoice} variant="outline" className="gap-2">
              <Play className="w-4 h-4" />Preview Voice
            </Button>
            <Button onClick={resetVoice} variant="ghost" className="gap-2 text-slate-500">
              <RotateCcw className="w-4 h-4" />Reset to default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}