"use client";

import { useEffect, useState } from "react";
import type { ApiDebugEvent } from "@/lib/api-debug";
import { API_DEBUG_EVENT_NAME } from "@/lib/api-debug";

const MAX_EVENTS = 30;

export function ApiDebugOverlay() {
  const [events, setEvents] = useState<ApiDebugEvent[]>([]);
  const [open, setOpen] = useState(false);

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

  // If there is nothing yet and it's closed, hide the button entirely.
  if (!open && events.length === 0) {
    return null;
  }

  const latestError = events.find((e) => e.ok === false);

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
        <div className="w-[340px] max-h-[320px] rounded-md border bg-background shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/60">
            <span className="font-medium text-[11px]">API debug (dev-only)</span>
            <span className="text-[10px] text-muted-foreground">
              Recent {events.length} calls
            </span>
          </div>

          <div className="max-h-[280px] overflow-auto">
            {events.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-muted-foreground">
                No API calls captured yet.
              </div>
            ) : (
              <table className="w-full border-collapse text-[10px]">
                <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold">Status</th>
                    <th className="px-2 py-1 text-left font-semibold">Method</th>
                    <th className="px-2 py-1 text-left font-semibold">Path</th>
                    <th className="px-2 py-1 text-right font-semibold">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
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
                          <div className="truncate max-w-[170px]">
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

