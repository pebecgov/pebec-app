"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const STORAGE_KEY = "pebec_tracker_presence_id";
const HEARTBEAT_MS = 20_000;

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return `t_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * Pings Convex while the visitor is on /tracker (MDA or state pages)
 * so admin can see a live "people on tracker" count.
 */
export default function TrackerPresenceHeartbeat() {
  const pathname = usePathname();
  const heartbeat = useMutation(api.tracker_presence.heartbeat);
  const leave = useMutation(api.tracker_presence.leave);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    const sessionId = sessionIdRef.current;

    const ping = () => {
      void heartbeat({
        sessionId,
        path: pathname || "/tracker",
        now: Date.now(),
      }).catch(() => {
        // Presence is best-effort; ignore transient failures.
      });
    };

    ping();
    const intervalId = window.setInterval(ping, HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onUnload = () => {
      void leave({ sessionId }).catch(() => undefined);
    };
    window.addEventListener("pagehide", onUnload);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
      void leave({ sessionId }).catch(() => undefined);
    };
  }, [heartbeat, leave, pathname]);

  return null;
}
