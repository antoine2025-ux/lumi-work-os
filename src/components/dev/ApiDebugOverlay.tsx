"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiDebugEvent } from "@/lib/api-debug";
import { API_DEBUG_EVENT_NAME } from "@/lib/api-debug";

const MAX_EVENTS = 30;

type StatusFilter = "all" | "ok" | "error";

export function ApiDebugOverlay() {
  const [events, setEvents] = useState<ApiDebugEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "development") return;

    function handle(event: Event) {
      const custom = event as CustomEvent<ApiDebugEvent>;
      const detail = custom.detail;
      if (!detail) return;

      setEvents((prev) => {
        const next = [detail, ...prev];
        return next.slice(0, MAX_EVENTS);
      });
    }

    window.addEventListener(API_DEBUG_EVENT_NAME, handle as EventListener);

    return () => {
      window.removeEventListener(API_DEBUG_EVENT_NAME, handle as EventListener);
    };
  }, []);

  const latestError = events.find((e) => e.ok === false);

  const labels = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.label) set.add(e.label);
    }
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter === "ok" && e.ok !== true) return false;
      if (statusFilter === "error" && e.ok !== false) return false;
      if (labelFilter !== "all") {
        if (!e.label || e.label !== labelFilter) return false;
      }
      return true;
    });
  }, [events, statusFilter, labelFilter]);

  function handleClear() {
    setEvents([]);
  }

  // If there is nothing yet and it's closed, hide the button entirely.
  if (!open && events.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 text-xs">
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`px-2 py-1 rounded-md border shadow-sm bg-background ${
            latestError ? "border-destructive text-destructive" : ""
          }`}
        >
          {open ? "Close API debug" : "API debug"}
          {latestError && !open && (
            <span className="ml-1 text-[10px]">(recent error)</span>
          )}
        </button>
      </div>

      {open && (
        <div className="w-[360px] max-h-[340px] rounded-md border bg-background shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/60">
            <div className="flex flex-col">
              <span className="font-medium text-[11px]">
                API debug (dev-only)
              </span>
              <span className="text-[10px] text-muted-foreground">
                Last {events.length} calls (showing {filteredEvents.length})
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-[10px] px-2 py-1 border rounded-md hover:bg-muted disabled:opacity-60"
              disabled={events.length === 0}
            >
              Clear
            </button>
          </div>

          <div className="px-3 py-2 border-b flex flex-wrap items-center gap-2 bg-muted/40">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="text-[10px] border rounded px-1.5 py-0.5 bg-background"
              >
                <option value="all">All</option>
                <option value="ok">Success</option>
                <option value="error">Errors</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Label:</span>
              <select
                value={labelFilter}
                onChange={(e) => setLabelFilter(e.target.value)}
                className="text-[10px] border rounded px-1.5 py-0.5 bg-background max-w-[140px]"
              >
                <option value="all">All</option>
                {labels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto">
            {filteredEvents.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-muted-foreground">
                No API calls match the current filters.
              </div>
            ) : (
              <table className="w-full border-collapse text-[10px]">
                <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold">
                      Status
                    </th>
                    <th className="px-2 py-1 text-left font-semibold">
                      Method
                    </th>
                    <th className="px-2 py-1 text-left font-semibold">Path</th>
                    <th className="px-2 py-1 text-right font-semibold">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((e) => {
                    const url = new URL(e.url, "http://dummy");
                    const path = url.pathname + url.search;
                    const statusLabel =
                      e.status != null ? e.status.toString() : "-";
                    const isError = e.ok === false;
                    const isOk = e.ok === true;

                    return (
                      <tr
                        key={`${e.id}-${e.timestamp}`}
                        className="border-t last:border-b hover:bg-muted/40"
                      >
                        <td className="px-2 py-1 align-top">
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 ${
                              isError
                                ? "bg-destructive/10 text-destructive border border-destructive/40"
                                : isOk
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/40"
                                : "bg-muted text-muted-foreground border border-muted-foreground/20"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-2 py-1 align-top whitespace-nowrap">
                          <span className="font-mono">{e.method}</span>
                        </td>
                        <td className="px-2 py-1 align-top">
                          <div className="truncate max-w-[190px]">
                            <span className="font-mono">{path}</span>
                          </div>
                          {e.label && (
                            <div className="text-[9px] text-muted-foreground mt-0.5">
                              {e.label}
                            </div>
                          )}
                          {e.errorMessage && (
                            <div className="text-[9px] text-destructive mt-0.5 line-clamp-2">
                              {e.errorMessage}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1 align-top text-right whitespace-nowrap">
                          {e.durationMs != null
                            ? e.durationMs.toFixed(1)
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
