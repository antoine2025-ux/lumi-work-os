"use client";

import { useEffect, useState } from "react";

type OrgLoopbrainLogItem = {
  id: string;
  createdAt: string;
  userId: string | null;
  question: string;
  answerPreview: string;
  contextItemsCount: number;
};

type LogsResponse =
  | {
      ok: true;
      workspaceId: string;
      count: number;
      logs: OrgLoopbrainLogItem[];
    }
  | {
      ok: false;
      error: string;
    };

export function OrgLoopbrainAnalyticsPanel() {
  const [logs, setLogs] = useState<OrgLoopbrainLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/dev/org-loopbrain/logs");
        const json: LogsResponse = await res.json();

        if (!res.ok || !("ok" in json) || !json.ok) {
          if (!cancelled) {
            setError(
              (json as any).error ??
                "Failed to load Org Loopbrain logs. This is only available in non-production environments."
            );
          }
          return;
        }

        if (!cancelled) {
          setLogs(json.logs);
        }
      } catch (e) {
        console.error("[OrgLoopbrainAnalyticsPanel] Failed to fetch logs", e);
        if (!cancelled) {
          setError(
            "Failed to load Org Loopbrain logs. This is only available in non-production environments."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLogs();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-medium">Recent Org Loopbrain questions</div>
          <div className="text-[11px] text-muted-foreground">
            Last 20 Org-aware questions asked to Loopbrain, with answer previews.
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Dev-only
        </span>
      </div>

      {loading && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          Loading Org Loopbrain activity…
        </div>
      )}

      {!loading && error && (
        <div className="mt-2 rounded-xl bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          No Org Loopbrain queries logged yet. Ask something in the Org QA panel
          to see activity here.
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {logs.map((log) => {
            const date = new Date(log.createdAt);
            const timeLabel = date.toLocaleString();

            return (
              <div
                key={log.id}
                className="rounded-xl border bg-background/60 p-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="line-clamp-2 text-[11px] font-medium">
                    {log.question}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {timeLabel}
                  </div>
                </div>

                <div className="line-clamp-2 text-[11px] text-muted-foreground">
                  {log.answerPreview}
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <div>
                    Context items used:{" "}
                    <span className="font-medium">
                      {log.contextItemsCount}
                    </span>
                  </div>
                  {log.userId && <div>User: {log.userId}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-1 text-[10px] text-muted-foreground">
        Source: <code>/api/dev/org-loopbrain/logs</code>. Data is workspace-scoped and
        intended for debugging Org → Loopbrain behavior.
      </div>
    </div>
  );
}

