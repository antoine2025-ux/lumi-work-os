import React from "react";
import type { AuditEntry } from "./auditLog";

function formatTime(ts: number) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function RecentChangesPanel({
  open,
  onToggle,
  entries,
  onClear,
}: {
  open: boolean;
  onToggle: () => void;
  entries: AuditEntry[];
  onClear: () => void;
}) {
  // Return plain content (no card/container styles)
  if (entries.length === 0) {
    return <div>No changes in this session.</div>;
  }

  return (
    <>
      <div className="space-y-2">
        {entries.slice(0, 8).map((e) => (
          <div
            key={e.id}
            className="flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-medium text-black/90 dark:text-white/90">
                {e.summary}
              </div>
              <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                by <span className="font-medium">{(e as any).actorLabel || "Unknown"}</span> · {formatTime(e.ts)}
              </div>
            </div>
          </div>
        ))}
      </div>
      {entries.length > 0 && onClear ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-black/50 hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
          >
            Clear
          </button>
        </div>
      ) : null}
    </>
  );
}

