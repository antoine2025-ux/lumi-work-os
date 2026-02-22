"use client";

import { useEffect, useState } from "react";

type OrgQnaLog = {
  id: string;
  question: string;
  location: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type OrgQnaHistoryResponse = {
  ok: boolean;
  logs: OrgQnaLog[];
};

type LocationStat = {
  location: string;
  count: number;
};

const DEFAULT_DAYS = 7;

export function OrgQnaSummaryStrip() {
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState<LocationStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("location", "all");
        params.set("days", String(DEFAULT_DAYS));
        params.set("limit", "100");

        const res = await fetch(
          `/api/loopbrain/org/qna/history?${params.toString()}`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        // Check content-type before parsing JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }

        const data = (await res.json()) as OrgQnaHistoryResponse;

        if (!data.ok) {
          throw new Error("History returned ok=false");
        }

        if (cancelled) return;

        const logs = data.logs ?? [];
        setTotal(logs.length);

        const bucket: Record<string, number> = {};
        for (const log of logs) {
          const key = log.location || "unknown";
          bucket[key] = (bucket[key] || 0) + 1;
        }

        const stats: LocationStat[] = Object.entries(bucket)
          .map(([location, count]) => ({ location, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        setLocations(stats);
      } catch (err) {
        console.error("Failed to load Org AI summary", err);
        if (!cancelled) {
          setError("Unable to load Org AI activity.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-4 py-3 text-xs">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Org AI activity
        </p>
        <p className="text-[11px] text-muted-foreground">
          Last {DEFAULT_DAYS} days · questions asked to Loopbrain.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px]">
        {loading && (
          <span className="text-muted-foreground">Loading…</span>
        )}

        {!loading && error && (
          <span className="text-destructive">{error}</span>
        )}

        {!loading && !error && (
          <>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              {total} question{total === 1 ? "" : "s"}
            </span>

            {locations.map((loc) => (
              <span
                key={loc.location}
                className="rounded-full bg-muted px-3 py-1 text-muted-foreground"
              >
                {loc.location} · {loc.count}
              </span>
            ))}

            {locations.length === 0 && (
              <span className="text-muted-foreground">
                No Org questions have been asked yet.
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

