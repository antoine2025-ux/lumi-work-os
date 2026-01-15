"use client";

import React from "react";
import { StatusPill } from "./StatusPill";
import { deriveOrgStatus } from "./status";
import type { FocusMode } from "./focus";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { CapacityBadge } from "./CapacityBadge";
import { deriveCurrentAvailability } from "@/lib/org/deriveAvailability";
import { deriveEffectiveCapacity } from "@/lib/org/deriveEffectiveCapacity";

export function PeopleCard({
  person,
  mode,
  selected,
  onToggleSelect,
  onOpen,
  onQuickFix,
  impactHint,
}: {
  person: any;
  mode: FocusMode;
  selected: boolean;
  onToggleSelect?: (p: any) => void;
  onOpen: (p: any) => void;
  onQuickFix: (p: any) => void;
  impactHint?: "high" | "medium" | "low";
}) {
  const status = deriveOrgStatus(person);
  const isManager = (person.directReportCount || 0) > 0;
  const name = person.fullName || person.name || "Unnamed";
  const isFixMode = mode === "fix";

  // Derive current availability from availability windows
  const availabilityWindows = person.availability?.map((a: any) => ({
    type: a.type === "UNAVAILABLE" ? "unavailable" : "partial",
    startDate: new Date(a.startDate),
    endDate: a.endDate ? new Date(a.endDate) : undefined,
    fraction: a.fraction,
  })) || [];
  const availability = deriveCurrentAvailability(availabilityWindows);

  // Derive effective capacity from availability and allocations
  const allocations = person.allocations?.map((a: any) => ({
    fraction: a.fraction,
    startDate: new Date(a.startDate),
    endDate: a.endDate ? new Date(a.endDate) : undefined,
  })) || [];
  const capacity = deriveEffectiveCapacity({
    availabilityStatus: availability.status,
    partialFraction: availability.fraction,
    allocations,
  });

  const handleCardClick = () => {
    if (isFixMode) {
      onQuickFix(person);
    } else {
      onOpen(person);
    }
  };

  return (
    <div
      className={[
        "group rounded-2xl border border-black/10 bg-white/70 p-4 transition-colors",
        "hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
        isManager ? "ring-1 ring-black/5 dark:ring-white/10" : "",
        isFixMode ? "cursor-pointer" : "",
        selected ? "ring-2 ring-black/20 dark:ring-white/20" : "",
      ].join(" ")}
      onClick={isFixMode ? handleCardClick : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isFixMode && onToggleSelect ? (
            <div className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect(person);
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-black/20 text-black focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:text-white dark:focus:ring-white/20"
              />
            </div>
          ) : null}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="truncate text-sm font-semibold text-black/90 dark:text-white/90">
              {name}
            </div>
            <AvailabilityBadge status={availability.status} fraction={availability.fraction} />
            <CapacityBadge effectiveFraction={capacity.effectiveFraction} />
          </div>
          <div className="mt-0.5 truncate text-xs text-black/50 dark:text-white/50">
            {(() => {
              const role = (person.title || person.role || "").toString();
              const team = (person.teamName || person.team) ? ` · ${(person.teamName || person.team).toString()}` : "";
              return `${role}${team}` || "—";
            })()}
          </div>
        </div>

        <div className="shrink-0">
          <StatusPill
            status={status}
            impactHint={isFixMode ? impactHint : undefined}
            showImpactHint={isFixMode && status.level !== "complete"}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end">
        {!isFixMode ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(person);
              }}
              className="rounded-xl border border-black/10 px-3 py-2 text-xs font-medium text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
            >
              Open
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickFix(person);
              }}
              className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-white dark:bg-white dark:text-black"
            >
              Quick fix
            </button>
          </div>
        ) : (
          <div className="text-xs font-medium text-black/70 dark:text-white/70">
            Click to fix
          </div>
        )}
      </div>
    </div>
  );
}

