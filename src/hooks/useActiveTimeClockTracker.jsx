import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const FLUSH_INTERVAL_MS = 30000; // push live GPS samples every 30s while on the clock
const MAX_HISTORY = 200;

/**
 * useActiveTimeClockTracker
 *
 * Tracks the *current user's* active time-clock session. When the user is
 * punched in, this hook installs a high-accuracy GPS watcher that streams
 * live location samples into the matching TimeClockEntry, so dispatch /
 * supervisors can see the worker's position on a Life360-style team map.
 *
 * Mount this once near the app shell (e.g. Layout) so the watcher keeps
 * running across page navigations — it should outlive the TimeClock page.
 */
export default function useActiveTimeClockTracker(companyId, userId, userName) {
  const [activeEntry, setActiveEntry] = useState(null);
  const [position, setPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [loading, setLoading] = useState(true);

  const watchIdRef = useRef(null);
  const lastFlushRef = useRef(0);
  const pendingSampleRef = useRef(null);
  const activeEntryRef = useRef(null);

  useEffect(() => {
    activeEntryRef.current = activeEntry;
  }, [activeEntry]);

  const loadActive = useCallback(async () => {
    if (!userId || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const entries = await base44.entities.TimeClockEntry.filter(
        { user_id: userId, company_id: companyId, status: "punched_in" },
        "-punched_in_at",
        5,
      );
      const e = entries[0] || null;
      setActiveEntry(e);
      if (e?.latitude != null) {
        setPosition({ lat: e.latitude, lng: e.longitude, accuracy: e.accuracy, ts: e.last_location_at });
      }
    } catch (err) {
      console.error("loadActive timeclock:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, companyId]);

  useEffect(() => {
    if (!companyId || !userId) return;
    loadActive();
  }, [companyId, userId, loadActive]);

  function maybeFlush() {
    const sample = pendingSampleRef.current;
    const entry = activeEntryRef.current;
    if (!sample || !entry?.id) return;
    const now = Date.now();
    if (now - lastFlushRef.current < FLUSH_INTERVAL_MS) return;
    lastFlushRef.current = now;

    const nextHistory = [...(entry.location_history || []), { lat: sample.lat, lng: sample.lng, ts: sample.ts }].slice(-MAX_HISTORY);

    base44.entities.TimeClockEntry
      .update(entry.id, {
        latitude: sample.lat,
        longitude: sample.lng,
        accuracy: sample.accuracy,
        last_location_at: sample.ts,
        location_history: nextHistory,
      })
      .then(() => {
        setActiveEntry((prev) =>
          prev
            ? {
                ...prev,
                latitude: sample.lat,
                longitude: sample.lng,
                accuracy: sample.accuracy,
                last_location_at: sample.ts,
                location_history: nextHistory,
              }
            : prev,
        );
        pendingSampleRef.current = null;
      })
      .catch((err) => console.warn("timeclock flush failed:", err));
  }

  // GPS watcher — runs only while the user is punched in
  useEffect(() => {
    if (!activeEntry?.id) {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation is not supported on this device");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        const sample = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          ts: new Date().toISOString(),
        };
        setPosition(sample);
        pendingSampleRef.current = sample;
        maybeFlush();
      },
      (err) => setGeoError(err.message || "GPS error"),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeEntry?.id]);

  function getFreshLocation() {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation is not supported on this device"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            ts: new Date().toISOString(),
          }),
        (err) => reject(new Error(err.message || "Could not get GPS")),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    });
  }

  async function punchIn() {
    if (!userId || !companyId) throw new Error("Missing user or company");
    let loc;
    try {
      loc = await getFreshLocation();
    } catch (err) {
      setGeoError(err.message);
      throw err;
    }
    const created = await base44.entities.TimeClockEntry.create({
      company_id: companyId,
      user_id: userId,
      user_name: userName || "Worker",
      status: "punched_in",
      punched_in_at: new Date().toISOString(),
      punch_in_location: loc,
      latitude: loc.lat,
      longitude: loc.lng,
      accuracy: loc.accuracy,
      last_location_at: loc.ts,
      location_history: [{ lat: loc.lat, lng: loc.lng, ts: loc.ts }],
    });
    setActiveEntry(created);
    setPosition(loc);
    pendingSampleRef.current = null;
    lastFlushRef.current = Date.now();
    return created;
  }

  async function punchOut() {
    const entry = activeEntryRef.current;
    if (!entry?.id) return null;
    let loc = null;
    try {
      loc = await getFreshLocation();
    } catch (err) {
      loc = null; // allow punch-out even if GPS fails
    }
    const now = new Date();
    const durMin = Math.max(0, Math.round((now - new Date(entry.punched_in_at)) / 60000));
    const updated = await base44.entities.TimeClockEntry.update(entry.id, {
      status: "punched_out",
      punched_out_at: now.toISOString(),
      duration_minutes: durMin,
      ...(loc ? { punch_out_location: loc, latitude: loc.lat, longitude: loc.lng, accuracy: loc.accuracy, last_location_at: loc.ts } : {}),
    });
    setActiveEntry(null);
    setPosition(null);
    pendingSampleRef.current = null;
    return updated;
  }

  return {
    activeEntry,
    position,
    geoError,
    loading,
    punchIn,
    punchOut,
    refresh: loadActive,
  };
}