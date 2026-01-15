"use client";

import React from "react";
import { PeopleCard } from "./PeopleCard";
import type { FocusMode } from "./focus";
import type { LoopBrainEvent } from "@/lib/loopbrain/signals";
import { computeImpactForPerson } from "@/lib/loopbrain/impact";

export function PeopleGrid({
  people,
  mode,
  selectedIds,
  onToggleSelect,
  onOpen,
  onQuickFix,
  signals = [],
}: {
  people: any[];
  mode: FocusMode;
  selectedIds?: Set<string>;
  onToggleSelect?: (p: any) => void;
  onOpen: (p: any) => void;
  onQuickFix: (p: any) => void;
  signals?: LoopBrainEvent[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => {
        // Compute impact for this person in Fix mode
        const impact = mode === "fix" && signals.length > 0
          ? computeImpactForPerson({
              person: p,
              signals,
              directReportCount: p.directReportCount || 0,
            })
          : null;
        
        const impactHint =
          impact && impact.score >= 7
            ? "high"
            : impact && impact.score >= 4
            ? "medium"
            : impact && impact.score > 0
            ? "low"
            : undefined;

        return (
          <PeopleCard
            key={p.id}
            person={p}
            mode={mode}
            selected={selectedIds?.has(p.id) || false}
            onToggleSelect={onToggleSelect}
            onOpen={onOpen}
            onQuickFix={onQuickFix}
            impactHint={impactHint}
          />
        );
      })}
    </div>
  );
}

