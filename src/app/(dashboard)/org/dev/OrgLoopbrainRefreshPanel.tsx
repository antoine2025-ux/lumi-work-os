"use client";

import { useState } from "react";

type RefreshState = "idle" | "running" | "done" | "error";

type HealthReport = {
  summary: {
    ok: boolean;
    totalIssues: number;
  };
};

export function OrgLoopbrainRefreshPanel() {
  const [state, setState] = useState<RefreshState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [issuesCount, setIssuesCount] = useState<number | null>(null);

  async function handleRefreshClick() {
    setState("running");
    setMessage(null);
    setIssuesCount(null);

    try {
      // 1) Trigger full Org context sync (ContextItem upsert)
      const syncRes = await fetch("/api/dev/org-context-sync", {
        method: "POST",
      });

      if (!syncRes.ok) {
        throw new Error("Failed to sync Org context bundle.");
      }

      // 2) Immediately fetch health report
      const healthRes = await fetch("/api/dev/org-context-health");
      if (!healthRes.ok) {
        throw new Error("Failed to fetch Org context health report.");
      }

      const healthJson: { ok: boolean; report: HealthReport } =
        await healthRes.json();

      const totalIssues = healthJson.report?.summary?.totalIssues ?? 0;
      const ok = healthJson.report?.summary?.ok ?? false;

      setIssuesCount(totalIssues);

      if (ok) {
        setMessage("Org context refreshed · 0 issues remaining ✅");
      } else {
        setMessage(
          `Org context refreshed · ${totalIssues} issue${
            totalIssues === 1 ? "" : "s"
          } remaining.`
        );
      }

      setState("done");
    } catch (error) {
      console.error("[OrgLoopbrainRefreshPanel] Refresh failed", error);
      setMessage("Failed to refresh Org context. See console logs for details.");
      setState("error");
    }
  }

  const disabled =
    state === "running" || process.env.NODE_ENV === "production";

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium">Org → Loopbrain refresh</div>
          <div className="text-[11px] text-muted-foreground">
            Runs a full Org → ContextItem sync and then executes the health
            checks. Dev-only, safe to use while iterating.
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground disabled:opacity-60"
        >
          {state === "running" ? "Refreshing…" : "Refresh & check"}
        </button>
      </div>

      {message && (
        <div
          className={`mt-1 rounded-xl px-2 py-1.5 text-[11px] ${
            state === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {message}{" "}
          {issuesCount != null && issuesCount > 0 && (
            <>
              <a
                href="/api/dev/org-context-health"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                View health report
              </a>
              {" · "}
              <a
                href="/api/dev/org-context-preview"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                View context preview
              </a>
            </>
          )}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground">
        Uses:
        <code className="ml-1">POST /api/dev/org-context-sync</code>
        {" + "}
        <code>GET /api/dev/org-context-health</code>
      </div>
    </div>
  );
}

