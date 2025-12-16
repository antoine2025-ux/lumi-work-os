// src/components/dev/OrgTelemetryCard.tsx

"use client";

import { useOrgTelemetry } from "@/hooks/useOrgTelemetry";

export function OrgTelemetryCard() {
  const { loading, error, stats, events, refresh } = useOrgTelemetry({
    refreshMs: 7000,
  });

  const total = stats?.total ?? 0;
  const orgCount = stats?.org ?? 0;
  const genericCount = stats?.generic ?? 0;

  const orgShare =
    total > 0 ? Math.round((orgCount / total) * 100) : 0;

  return (
    <section className="rounded-lg border border-gray-700 bg-gray-900/40 p-4 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            Org Routing Telemetry (dev)
          </h2>
          <p className="text-xs text-gray-400">
            Shows how often Loopbrain routes questions through Org mode.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="rounded border border-gray-600 px-3 py-1 text-xs hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="rounded border border-red-500 bg-red-900/20 p-3 text-xs">
          <div className="font-semibold mb-1">Error</div>
          <div className="font-mono whitespace-pre-wrap">
            {error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-md bg-black/40 p-3">
          <div className="text-xs text-gray-400">Total questions</div>
          <div className="mt-1 text-xl font-semibold">
            {total}
          </div>
        </div>
        <div className="rounded-md bg-black/40 p-3">
          <div className="text-xs text-gray-400">Org-mode</div>
          <div className="mt-1 text-xl font-semibold">
            {orgCount}
          </div>
          <div className="text-xs text-gray-400">
            {orgShare}% of total
          </div>
        </div>
        <div className="rounded-md bg-black/40 p-3">
          <div className="text-xs text-gray-400">Generic</div>
          <div className="mt-1 text-xl font-semibold">
            {genericCount}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Recent routed questions
          </h3>
          <span className="text-xs text-gray-500">
            Showing latest {Math.min(events.length, 5)}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="text-xs text-gray-400">
            No routing telemetry yet. Ask a few questions via Loopbrain.
          </div>
        ) : (
          <ul className="space-y-2 text-xs">
            {events.slice(0, 5).map((e, idx) => (
              <li
                key={`${e.timestamp}-${idx}`}
                className="rounded border border-gray-700 bg-black/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        e.mode === "org"
                          ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700"
                          : "bg-gray-800 text-gray-300 border border-gray-600"
                      }`}
                    >
                      {e.mode.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      wantsOrg:{" "}
                      <span className="font-mono">
                        {String(e.wantsOrg)}
                      </span>{" "}
                      • hasOrgContext:{" "}
                      <span className="font-mono">
                        {String(e.hasOrgContext)}
                      </span>
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[11px] text-gray-300">
                  {e.question.length > 200
                    ? e.question.slice(0, 200) + "…"
                    : e.question}
                </div>
                {e.workspaceId && (
                  <div className="mt-1 text-[10px] text-gray-500 font-mono">
                    workspace: {e.workspaceId}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

