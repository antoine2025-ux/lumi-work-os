"use client";

import React, { useEffect, useState, useMemo } from "react";
import { computeCompletenessFromSignals } from "@/lib/loopbrain/deriveSignals";
import type { LoopBrainEvent } from "@/lib/loopbrain/signals";

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  return d.toLocaleDateString();
}

type Person = {
  id: string;
  managerId?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  team?: string | null;
  role?: string | null;
  title?: string | null;
};

export function OrgHealthStrip({
  canEdit,
  people = [],
  signals = [],
}: {
  canEdit: boolean;
  people?: Person[];
  signals?: LoopBrainEvent[];
}) {
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [useSignals, setUseSignals] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Compute completeness from signals if available
  const completenessFromSignals = useMemo(() => {
    if (people.length > 0 && signals.length > 0) {
      return computeCompletenessFromSignals(people, signals);
    }
    return null;
  }, [people, signals]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/org/health?mode=latest", { cache: "no-store" });
    const data = await res.json().catch(() => ({} as any));
    if (data?.ok) setSnapshot(data.snapshot);
    setLoading(false);
  }

  useEffect(() => {
    // Prefer signals if available, otherwise fall back to API
    if (completenessFromSignals) {
      setUseSignals(true);
    } else {
      setUseSignals(false);
      load();
    }

    // Load last fix event timestamp
    (async () => {
      try {
        const res = await fetch("/api/org/fix-events?limit=1", { cache: "no-store" });
        const data = await res.json().catch(() => ({} as any));
        if (data?.ok && Array.isArray(data.events) && data.events.length > 0) {
          setLastUpdated(data.events[0].createdAt);
        }
      } catch (error) {
        console.warn("Failed to load last fix event:", error);
      }
    })();
  }, [completenessFromSignals]);

  async function measure() {
    await fetch("/api/org/health/measure", { method: "POST" });
    await load();
  }

  // Use signals-based completeness if available, otherwise use API snapshot
  const score = useSignals && completenessFromSignals
    ? completenessFromSignals.overall
    : snapshot?.score != null
    ? Math.round(snapshot.score * 100)
    : null;

  const reportingLines = useSignals && completenessFromSignals
    ? completenessFromSignals.reportingLines
    : Math.round((snapshot?.metrics?.breakdown?.reportingLines || 0) * 100);

  const teams = useSignals && completenessFromSignals
    ? completenessFromSignals.teams
    : Math.round((snapshot?.metrics?.breakdown?.teamsAssigned || 0) * 100);

  const roles = useSignals && completenessFromSignals
    ? completenessFromSignals.roles
    : Math.round((snapshot?.metrics?.breakdown?.rolesAssigned || 0) * 100);

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <span className="text-xs text-black/50 dark:text-white/50">Completeness:</span>
        {loading && !useSignals ? (
          <span className="text-xs text-black/60 dark:text-white/60">Loading…</span>
        ) : score != null ? (
          <span className="font-semibold text-black/90 dark:text-white/90">{score}%</span>
        ) : (
          <span className="text-xs text-black/60 dark:text-white/60">—</span>
        )}
        <div className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40">
          <span>R:{reportingLines}%</span>
          <span>T:{teams}%</span>
          <span>Role:{roles}%</span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-black/40 dark:text-white/40">
            · Last updated {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>
      {canEdit && !useSignals && (
        <button
          type="button"
          disabled={loading}
          onClick={measure}
          className="rounded-lg border border-black/10 px-2 py-1 text-xs text-black/60 hover:bg-black/5 disabled:text-black/40 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10 dark:disabled:text-white/40"
        >
          Refresh
        </button>
      )}
    </div>
  );
}

