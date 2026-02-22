// src/hooks/useOrgTelemetry.ts

"use client";

import { useEffect, useState } from "react";

type OrgRoutingMode = "org" | "generic";

type OrgRoutingEvent = {
  question: string;
  mode: OrgRoutingMode;
  wantsOrg: boolean;
  hasOrgContext: boolean;
  workspaceId?: string | null;
  timestamp: string;
};

type OrgRoutingStats = {
  total: number;
  org: number;
  generic: number;
};

type OrgTelemetryResponse = {
  ok: boolean;
  stats: OrgRoutingStats;
  events: OrgRoutingEvent[];
};

type UseOrgTelemetryResult = {
  loading: boolean;
  error: string | null;
  stats: OrgRoutingStats | null;
  events: OrgRoutingEvent[];
  refresh: () => Promise<void>;
};

export function useOrgTelemetry(
  options?: { refreshMs?: number }
): UseOrgTelemetryResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrgRoutingStats | null>(null);
  const [events, setEvents] = useState<OrgRoutingEvent[]>([]);

  const refreshMs = options?.refreshMs ?? 5000;

  async function fetchTelemetry() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dev/org-telemetry");

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data: OrgTelemetryResponse = await res.json();

      setStats(data.stats);
      setEvents(data.events);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load Org telemetry");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTelemetry();
    const id = setInterval(fetchTelemetry, refreshMs);
    return () => clearInterval(id);
     
  }, [refreshMs]);

  return {
    loading,
    error,
    stats,
    events,
    refresh: fetchTelemetry,
  };
}

