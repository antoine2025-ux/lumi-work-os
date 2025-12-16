"use client";

import React from "react";
import type { FilterKey } from "./savedViews";

function Chip({
  active,
  label,
  count,
  onClick,
  tone,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
  tone: "neutral" | "attention";
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2";
  const cls = active
    ? tone === "attention"
      ? "bg-amber-400/20 text-black ring-amber-400/30 dark:text-white"
      : "bg-black/10 text-black ring-black/20 dark:bg-white/15 dark:text-white dark:ring-white/20"
    : tone === "attention"
      ? "border border-amber-300/60 text-black/70 hover:bg-amber-50/60 hover:text-black ring-amber-400/20 dark:border-amber-400/30 dark:text-white/70 dark:hover:bg-amber-400/10"
      : "border border-black/10 text-black/70 hover:bg-black/5 hover:text-black ring-black/20 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10";

  return (
    <button type="button" className={`${base} ${cls}`} onClick={onClick}>
      <span>{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] text-black/70 dark:bg-white/10 dark:text-white/70">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function FiltersChips({
  active,
  counts,
  onToggle,
  onClear,
}: {
  active: Set<FilterKey>;
  counts: Record<FilterKey, number>;
  onToggle: (k: FilterKey) => void;
  onClear: () => void;
}) {
  const anyActive = active.size > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        active={active.has("missingReporting")}
        label="Missing reporting"
        count={counts.missingReporting}
        onClick={() => onToggle("missingReporting")}
        tone="attention"
      />
      <Chip
        active={active.has("missingRole")}
        label="Missing role"
        count={counts.missingRole}
        onClick={() => onToggle("missingRole")}
        tone="attention"
      />
      <Chip
        active={active.has("missingTeam")}
        label="Missing team"
        count={counts.missingTeam}
        onClick={() => onToggle("missingTeam")}
        tone="attention"
      />
      <Chip
        active={active.has("managersOnly")}
        label="Managers only"
        count={counts.managersOnly}
        onClick={() => onToggle("managersOnly")}
        tone="neutral"
      />
      <Chip
        active={active.has("needsAttention")}
        label="Needs attention"
        count={counts.needsAttention}
        onClick={() => onToggle("needsAttention")}
        tone="attention"
      />
      {anyActive ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/60 hover:bg-black/5 hover:text-black dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10"
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}

