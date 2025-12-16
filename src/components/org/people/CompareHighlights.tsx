"use client";

import { cn } from "@/lib/utils";
import type { OrgPerson } from "@/types/org";

type CompareHighlightsProps = {
  people: OrgPerson[];
};

/**
 * Compare highlights component
 * Shows insights about the comparison set
 */
export function CompareHighlights({ people }: CompareHighlightsProps) {
  if (people.length < 2) return null;

  const highlights: string[] = [];

  // Same department
  const departments = new Set(people.map((p) => p.departmentId).filter(Boolean));
  if (departments.size === 1) {
    highlights.push("Same department");
  } else if (departments.size > 1) {
    highlights.push(`${departments.size} different departments`);
  }

  // Same team
  const teams = new Set(people.map((p) => p.teamId).filter(Boolean));
  if (teams.size === 1) {
    highlights.push("Same team");
  } else if (teams.size > 1) {
    highlights.push(`${teams.size} different teams`);
  }

  // Tenure spread
  const tenures = people
    .map((p) => {
      if (!p.joinedAt) return null;
      try {
        const joined = new Date(p.joinedAt);
        const now = new Date();
        const years = (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return years;
      } catch {
        return null;
      }
    })
    .filter((t): t is number => t !== null);

  if (tenures.length > 1) {
    const min = Math.min(...tenures);
    const max = Math.max(...tenures);
    const minStr = min < 1 ? `${Math.round(min * 12)} mo` : `${min.toFixed(1)} yr`;
    const maxStr = max < 1 ? `${Math.round(max * 12)} mo` : `${max.toFixed(1)} yr`;
    highlights.push(`Tenure: ${minStr} – ${maxStr}`);
  }

  if (highlights.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-800/30 border border-white/5">
      {highlights.map((highlight, index) => (
        <span
          key={index}
          className="text-xs text-slate-300 px-2 py-1 rounded bg-slate-800/50"
        >
          {highlight}
        </span>
      ))}
    </div>
  );
}

