"use client";

import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDepartmentAccent } from "@/components/org/structure/accent-colors";

/**
 * Standardized Pill component for displaying counts
 * Used consistently across Org chart and other views
 */

export type OrgDepartmentRowProps = {
  id: string;
  name: string;
  leaderName: string | null;
  leaderInitials?: string; // e.g. "SG"
  leaderRole?: string; // e.g. "Department lead"
  reportsToName?: string; // e.g. "Jordan Cole"
  teamsCount: number;
  peopleCount: number;
  isHiring?: boolean;
  recentChangeSummary?: string; // e.g. "+3 / -1 last 30 days"
  isReorg?: boolean;
  onOpenStructure: (id: string) => void;
  onViewPeople: (id: string) => void;
  accentIndex?: number; // index for accent color (defaults to 0)
};

/**
 * Premium department row component for Org chart
 * Enterprise-grade navigation surface with consistent styling
 * Entire card is clickable as primary CTA
 */
export function OrgDepartmentRow(props: OrgDepartmentRowProps) {
  const {
    id,
    name,
    leaderName,
    leaderInitials,
    leaderRole,
    reportsToName,
    teamsCount,
    peopleCount,
    isHiring,
    recentChangeSummary,
    isReorg,
    onOpenStructure,
    onViewPeople,
    accentIndex = 0,
  } = props;

  // Get accent color and extract gradient class
  const accent = getDepartmentAccent(accentIndex);
  const accentColorClass = accent.iconBg;

  function handleOpenStructure() {
    onOpenStructure(id);
  }

  function handleViewPeople(e: React.MouseEvent) {
    e.stopPropagation();
    onViewPeople(id);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpenStructure}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpenStructure();
        }
      }}
      className={cn(
        "group relative flex w-full items-center justify-between",
        "rounded-3xl",
        "bg-card/80",
        "hover:bg-card/90",
        "hover:-translate-y-[1px]",
        "transition-all",
        "border border-white/5",
        "hover:border-white/10",
        "shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
        "hover:shadow-[0_32px_96px_rgba(0,0,0,0.45)]",
        "px-8 py-6",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      )}
      aria-label={`${name}, led by ${leaderName || "no leader"}${reportsToName ? `, reports to ${reportsToName}` : ""}`}
    >
      {/* LEFT CLUSTER */}
      <div className="flex min-w-0 items-center gap-5 flex-1">
        {/* Icon tile */}
        <div
          className={cn(
            "h-16 w-16 rounded-2xl",
            "flex items-center justify-center",
            accentColorClass,
            "text-foreground",
            "shadow-[0_18px_40px_rgba(0,0,0,0.6)]",
            "group-hover:shadow-[0_24px_64px_rgba(0,0,0,0.7)]",
            "group-hover:opacity-90",
            "transition-all",
            "flex-shrink-0"
          )}
        >
          <Building2 className="h-7 w-7" />
        </div>

        {/* Text block */}
        <div className="flex min-w-0 flex-col gap-1 flex-1">
          {/* Department name */}
          <div className="text-lg font-semibold text-foreground">
            {name}
          </div>

          {/* Leader line */}
          {leaderName ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/70 min-w-0">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/80 text-[11px] font-medium text-foreground/80 flex-shrink-0">
                {leaderInitials}
              </span>
              <span className="truncate max-w-[180px]">{leaderName}</span>
              {leaderRole && (
                <>
                  <span className="mx-1 text-foreground/35">·</span>
                  <span className="text-foreground/60">{leaderRole}</span>
                </>
              )}
            </p>
          ) : (
            <div className="text-xs text-foreground/60">
              No leader assigned
            </div>
          )}

          {/* Reporting line – only when present */}
          {reportsToName && (
            <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] leading-snug text-foreground/45">
              <span className="uppercase tracking-[0.14em] text-[10px] text-foreground/35">
                Reports to
              </span>
              <span className="text-foreground/60">{reportsToName}</span>
            </p>
          )}
        </div>
      </div>

      {/* RIGHT CLUSTER */}
      <div className="ml-8 flex flex-shrink-0 items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted/70 px-3 py-1 text-xs text-foreground/70">
            {teamsCount === 1 ? "1 team" : `${teamsCount} teams`}
          </span>
          <span className="rounded-full bg-muted/70 px-3 py-1 text-xs text-foreground/70">
            {peopleCount === 1 ? "1 person" : `${peopleCount} people`}
          </span>

          {isHiring && (
            <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
              Hiring
            </span>
          )}

          {recentChangeSummary && (
            <span className="rounded-full bg-muted/70 px-3 py-1 text-[11px] text-foreground/70">
              {recentChangeSummary}
            </span>
          )}

          {isReorg && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] text-amber-200">
              Reorganized
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleViewPeople}
          className={cn(
            "ml-2 text-xs font-medium text-foreground/60",
            "underline-offset-2",
            "hover:text-foreground/80 hover:underline",
            "transition-all duration-200"
          )}
        >
          View people
        </button>
      </div>
    </div>
  );
}

