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

const LOCATION_OPTIONS = [
  { value: "all", label: "All locations" },
  { value: "org-dashboard", label: "Org dashboard" },
  { value: "people-page", label: "People pages" },
  { value: "team-page", label: "Team pages" },
  { value: "dept-page", label: "Department pages" },
];

const DAYS_OPTIONS = [
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
];

export function OrgQnaHistoryPanel() {
  const [logs, setLogs] = useState<OrgQnaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<string>("all");
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("location", location || "all");
        params.set("days", String(days));
        params.set("limit", "20");

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

        if (!cancelled) {
          setLogs(data.logs ?? []);
        }
      } catch (err) {
        console.error("Failed to load Org Q&A history", err);
        if (!cancelled) {
          setError("Unable to load Org AI question history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [location, days]);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Org AI activity
          </h2>
          <p className="text-xs text-muted-foreground">
            Recent questions sent to Loopbrain about your org.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <select
            className="rounded-md border bg-background px-2 py-1"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border bg-background px-2 py-1"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {DAYS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading && (
        <p className="text-xs text-muted-foreground">Loading history…</p>
      )}

      {error && !loading && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {!loading && !error && logs.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No questions match these filters yet.
        </p>
      )}

      {!loading && !error && logs.length > 0 && (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded-md bg-muted px-3 py-2 text-xs leading-snug"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {log.question}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {log.location && (
                  <span className="rounded-full bg-background px-2 py-0.5">
                    {log.location}
                  </span>
                )}
                <span>
                  {new Date(log.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
