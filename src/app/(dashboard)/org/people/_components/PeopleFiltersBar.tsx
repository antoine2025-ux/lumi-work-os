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
    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2";
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
      {typeof count === "number" ? (
        <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs text-black/70 dark:bg-white/10 dark:text-white/70">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SmallButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
    >
      {label}
    </button>
  );
}

export function PeopleFiltersBar({
  active,
  counts,
  onToggle,
  onClear,
  onOpenSavedViews,
  showBulkActions,
  onOpenBulkActions,
  showing,
  total,
  onOpenOrgIssuesView,
}: {
  active: Set<FilterKey>;
  counts: Record<FilterKey, number>;
  onToggle: (k: FilterKey) => void;
  onClear: () => void;
  onOpenSavedViews: () => void;
  showBulkActions: boolean;
  onOpenBulkActions: () => void;
  showing?: number;
  total?: number;
  onOpenOrgIssuesView: () => void;
}) {
  const anyActive = active.size > 0;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-black/90 dark:text-white/90">
            Filters
          </div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
            Expert controls — reduce cognitive load by focusing intent.
            {typeof showing === "number" && typeof total === "number" && showing !== total ? (
              <span className="ml-2">Showing <span className="font-medium text-black/70 dark:text-white/70">{showing}</span> of {total}</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenOrgIssuesView}
            className="text-xs font-medium text-black/60 underline decoration-black/20 underline-offset-4 hover:text-black hover:decoration-black/40 dark:text-white/60 dark:decoration-white/20 dark:hover:text-white dark:hover:decoration-white/40"
          >
            Org issues view
          </button>
          <SmallButton label="Saved views" onClick={onOpenSavedViews} />
          {showBulkActions ? (
            <SmallButton label="Bulk actions" onClick={onOpenBulkActions} />
          ) : null}
          {anyActive ? (
            <SmallButton label="Clear" onClick={onClear} />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip
          active={active.has("needsAttention")}
          label="Needs attention"
          count={counts.needsAttention}
          onClick={() => onToggle("needsAttention")}
          tone="attention"
        />
        <Chip
          active={active.has("missingReporting")}
          label="Missing reporting line"
          count={counts.missingReporting}
          onClick={() => onToggle("missingReporting")}
          tone="attention"
        />
        <Chip
          active={active.has("missingRole")}
          label="Missing role"
          count={counts.missingRole}
          onClick={() => onToggle("missingRole")}
          tone="neutral"
        />
        <Chip
          active={active.has("missingTeam")}
          label="Missing team"
          count={counts.missingTeam}
          onClick={() => onToggle("missingTeam")}
          tone="neutral"
        />
        <Chip
          active={active.has("managersOnly")}
          label="Managers only"
          count={counts.managersOnly}
          onClick={() => onToggle("managersOnly")}
          tone="neutral"
        />
      </div>
    </div>
  );
}

