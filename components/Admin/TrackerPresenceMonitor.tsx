"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Users } from "lucide-react";

const REFRESH_MS = 10_000;

/**
 * Live count of people currently on the public MDA/state tracker.
 * For admin / staff monitoring only.
 */
export default function TrackerPresenceMonitor({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const counts = useQuery(api.tracker_presence.getLiveCounts, { now });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const total = counts?.total;
  const loading = counts === undefined;

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-950"
        title="People with the public tracker open right now (MDA + state pages)"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
        </span>
        <Users className="h-3.5 w-3.5" />
        <span className="font-semibold tabular-nums">
          {loading ? "…" : total ?? 0}
        </span>
        <span className="text-emerald-800/80">on tracker</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
          </span>
          <Users className="h-4 w-4 text-emerald-800" />
          <div>
            <p className="text-sm font-semibold text-emerald-950">
              Tracker visitors right now
            </p>
            <p className="text-xs text-emerald-900/70">
              Public MDA &amp; state tracker · updates every {REFRESH_MS / 1000}s
            </p>
          </div>
        </div>
        <div className="text-3xl font-bold tabular-nums text-emerald-900">
          {loading ? "…" : total ?? 0}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs sm:text-sm text-emerald-950/90">
        <span className="rounded-md bg-white/70 px-2.5 py-1 border border-emerald-100">
          MDAs:{" "}
          <strong className="tabular-nums">{loading ? "…" : counts?.mdas ?? 0}</strong>
        </span>
        <span className="rounded-md bg-white/70 px-2.5 py-1 border border-emerald-100">
          States:{" "}
          <strong className="tabular-nums">{loading ? "…" : counts?.states ?? 0}</strong>
        </span>
        {(counts?.other ?? 0) > 0 ? (
          <span className="rounded-md bg-white/70 px-2.5 py-1 border border-emerald-100">
            Other: <strong className="tabular-nums">{counts?.other ?? 0}</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}
