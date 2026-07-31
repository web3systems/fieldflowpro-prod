import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Clock, Play, Square, Loader2, MapPin, AlertCircle,
  ChevronRight,
} from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR = "© OpenStreetMap contributors";

function fmtDuration(ms) {
  if (!ms || ms < 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], map.getZoom() || 16, { animate: true });
  }, [position]);
  return null;
}

export default function TimeClock() {
  const { user, activeCompany, timeClock } = useApp();
  const { toast } = useToast();

  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const activeEntry = timeClock?.activeEntry;
  const position = timeClock?.position;
  const geoError = timeClock?.geoError;
  const isAdminOrManager = ["admin", "super_admin", "manager"].includes(user?.role);

  // Live ticking timer while on the clock
  useEffect(() => {
    if (!activeEntry?.punched_in_at) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => {
      setElapsed(Date.now() - new Date(activeEntry.punched_in_at).getTime());
    }, 1000);
    setElapsed(Date.now() - new Date(activeEntry.punched_in_at).getTime());
    return () => clearInterval(t);
  }, [activeEntry?.punched_in_at]);

  async function handlePunchIn() {
    setBusy(true);
    try {
      await timeClock.punchIn();
      toast({ title: "Clocked in ✓", description: "Sharing live GPS with dispatch." });
    } catch (err) {
      toast({ title: "Could not punch in", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handlePunchOut() {
    if (!window.confirm("Punch out and stop sharing your location?")) return;
    setBusy(true);
    try {
      const updated = await timeClock.punchOut();
      const dur = updated?.duration_minutes ?? 0;
      toast({ title: "Clocked out", description: `Worked ${dur} min.` });
    } catch (err) {
      toast({ title: "Could not punch out", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const trail = activeEntry?.location_history || [];
  const liveCenter = position
    ? [position.lat, position.lng]
    : activeEntry?.latitude != null
      ? [activeEntry.latitude, activeEntry.longitude]
      : null;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-500" />
        <h1 className="text-xl font-bold text-slate-900">Time Clock</h1>
      </div>
      <p className="text-sm text-slate-500 -mt-2">
        Punch in to share live GPS with your dispatch team while you work. Keep the app open while on the clock.
      </p>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">{activeEntry ? "On the clock" : "Clocked out"}</p>
            <p className="mt-1 font-mono text-3xl font-bold text-slate-900">{fmtDuration(elapsed)}</p>
            {activeEntry && (
              <p className="text-xs text-slate-400 mt-1">
                Started {new Date(activeEntry.punched_in_at).toLocaleTimeString()}
              </p>
            )}
          </div>
          {!activeEntry ? (
            <Button onClick={handlePunchIn} disabled={busy} className="gap-2 bg-emerald-600 hover:bg-emerald-700 h-12 px-5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Punch In
            </Button>
          ) : (
            <Button onClick={handlePunchOut} disabled={busy} variant="destructive" className="gap-2 h-12 px-5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Punch Out
            </Button>
          )}
        </div>

        {geoError && (
          <p className="mt-3 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> GPS: {geoError}
          </p>
        )}
        {activeEntry && (
          <p className="mt-3 text-xs text-emerald-700 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Live location sharing on
            {position?.accuracy ? ` · ±${Math.round(position.accuracy)}m` : ""}
          </p>
        )}
      </Card>

      {liveCenter ? (
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-medium text-slate-600">
                {activeEntry ? "Live location · updating" : "Last known position"}
              </span>
            </div>
            {isAdminOrManager && (
              <Link to="/TimeClockMap" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Team map <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div style={{ height: 360 }}>
            <MapContainer center={liveCenter} zoom={16} style={{ height: "100%", width: "100%" }}>
              <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
              <Recenter position={position} />
              {trail.length > 1 && (
                <Polyline positions={trail.map((t) => [t.lat, t.lng])} color="#2563eb" weight={3} opacity={0.7} />
              )}
              <Circle
                center={liveCenter}
                radius={position?.accuracy || 30}
                pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.1 }}
              />
              <Marker position={liveCenter} />
            </MapContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-400">
          No location yet. Punch in to share live GPS with your team.
        </div>
      )}

      <RecentSessions companyId={activeCompany?.id} userId={user?.id} />
    </div>
  );
}

function RecentSessions({ companyId, userId }) {
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    if (!companyId || !userId) return;
    base44.entities.TimeClockEntry
      .filter({ user_id: userId, company_id: companyId, status: "punched_out" }, "-punched_out_at", 10)
      .then(setSessions)
      .catch(() => {});
  }, [companyId, userId]);

  if (sessions.length === 0) return null;
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent sessions</p>
      <div className="space-y-1">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-b-0">
            <div>
              <p className="font-medium text-slate-700">{new Date(s.punched_in_at).toLocaleDateString()}</p>
              <p className="text-xs text-slate-400">
                {new Date(s.punched_in_at).toLocaleTimeString()} →{" "}
                {s.punched_out_at ? new Date(s.punched_out_at).toLocaleTimeString() : ""}
              </p>
            </div>
            <span className="font-mono font-semibold text-slate-700">{s.duration_minutes ?? 0} min</span>
          </div>
        ))}
      </div>
    </Card>
  );
}