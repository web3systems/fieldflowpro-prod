import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, RefreshCw, Users, Clock } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR = "© OpenStreetMap contributors";

const AVATAR_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function fmtAgo(ts) {
  if (!ts) return "—";
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m ago`;
}

function buildIcon(name, color, fresh) {
  const initial = (name || "?").trim()[0].toUpperCase();
  const dot = fresh ? "" : "opacity:0.5;";
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:${color};color:#fff;font-weight:700;font-size:14px;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);${dot}">${initial}</div>`,
  });
}

function FitBounds({ entries }) {
  const map = useMap();
  useEffect(() => {
    const located = entries.filter((e) => e.latitude != null);
    if (located.length === 0) return;
    if (located.length === 1) {
      map.setView([located[0].latitude, located[0].longitude], 14, { animate: true });
    } else {
      const bounds = L.latLngBounds(located.map((e) => [e.latitude, e.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [entries.length]);
  return null;
}

export default function TimeClockMap() {
  const { user, activeCompany, companyRole } = useApp();
  const isAdmin =
    ["admin", "super_admin", "manager"].includes(user?.role) ||
    ["admin", "super_admin", "manager"].includes(companyRole);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function load() {
    if (!activeCompany?.id) return;
    setLoading(true);
    try {
      const active = await base44.entities.TimeClockEntry.filter(
        { company_id: activeCompany.id, status: "punched_in" },
        "-last_location_at",
        200,
      );
      setEntries(active);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [activeCompany?.id]);

  // Realtime updates as workers stream live GPS
  useEffect(() => {
    if (!activeCompany?.id) return;
    const unsubscribe = base44.entities.TimeClockEntry.subscribe((event) => {
      if (!event?.data) return;
      setEntries((prev) => {
        if (event.type === "delete") return prev.filter((e) => e.id !== event.data.id);
        if (event.data.company_id !== activeCompany.id) return prev;
        if (event.data.status === "punched_in") {
          return prev.some((e) => e.id === event.data.id)
            ? prev.map((e) => (e.id === event.data.id ? event.data : e))
            : [...prev, event.data];
        }
        if (event.data.status === "punched_out") return prev.filter((e) => e.id !== event.data.id);
        return prev;
      });
      setSelected((prev) => (prev?.id === event.data.id && event.data.status === "punched_out" ? null : prev));
    });
    return unsubscribe;
  }, [activeCompany?.id]);

  // Fallback refresh to catch stale state
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [activeCompany?.id]);

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <Card className="p-8">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">Access restricted</p>
          <p className="text-sm text-slate-400">The team live map is available to admins and managers only.</p>
        </Card>
      </div>
    );
  }

  const located = entries.filter((e) => e.latitude != null && e.longitude != null);
  const initialCenter = located[0] ? [located[0].latitude, located[0].longitude] : [39.5, -98.35];

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500" />
          <h1 className="text-xl font-bold text-slate-900">Team Live Map</h1>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            {entries.length} on the clock
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>
      <p className="text-sm text-slate-500 mb-3">
        Tracks update live as team members move while on the clock (about every 30 seconds).
      </p>

      {loading && entries.length === 0 ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No one is on the clock right now.</p>
          <p className="text-sm text-slate-400">Once a team member punches in, they'll appear here in real time.</p>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-200" style={{ minHeight: 500 }}>
            <div style={{ height: 500 }}>
              <MapContainer center={initialCenter} zoom={4} style={{ height: "100%", width: "100%" }}>
                <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
                <FitBounds entries={entries} />
                {located.map((e, i) => {
                  const fresh = e.last_location_at && Date.now() - new Date(e.last_location_at).getTime() < 5 * 60 * 1000;
                  return (
                    <Marker
                      key={e.id}
                      position={[e.latitude, e.longitude]}
                      icon={buildIcon(e.user_name, AVATAR_COLORS[i % AVATAR_COLORS.length], fresh)}
                      eventHandlers={{ click: () => setSelected(e) }}
                    >
                      <Popup>
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-sm">{e.user_name}</p>
                          <p>Last seen {fmtAgo(e.last_location_at)}</p>
                          {e.accuracy && <p>±{Math.round(e.accuracy)}m accuracy</p>}
                          {e.punched_in_at && (
                            <p>On since {new Date(e.punched_in_at).toLocaleTimeString()}</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {selected?.location_history?.length > 1 && (
                  <Polyline
                    positions={selected.location_history.map((p) => [p.lat, p.lng])}
                    pathOptions={{ color: "#2563eb", weight: 3, opacity: 0.6 }}
                  />
                )}
                {selected && selected.latitude != null && selected.accuracy && (
                  <Circle
                    center={[selected.latitude, selected.longitude]}
                    radius={selected.accuracy}
                    pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.08 }}
                  />
                )}
              </MapContainer>
            </div>
          </div>

          <Card className="lg:w-72 p-0 lg:h-[500px] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">On the clock</p>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto">
              {entries.map((e, i) => {
                const hasLoc = e.latitude != null;
                const fresh = e.last_location_at && Date.now() - new Date(e.last_location_at).getTime() < 5 * 60 * 1000;
                const isActive = selected?.id === e.id;
                return (
                  <button
                    key={e.id}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 ${
                      isActive ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelected(e)}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: hasLoc && fresh ? "#22c55e" : "#cbd5e1" }}
                    />
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {(e.user_name || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{e.user_name}</p>
                      <p className="text-xs text-slate-400">
                        {hasLoc ? `Last seen ${fmtAgo(e.last_location_at)}` : "No GPS yet"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}