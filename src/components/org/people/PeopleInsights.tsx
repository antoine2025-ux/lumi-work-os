"use client";

import { cn } from "@/lib/utils";
import { InfoTooltip } from "./InfoTooltip";
import type { OrgPerson } from "@/types/org";

type PeopleInsightsProps = {
  people: OrgPerson[];
  isLoading?: boolean;
  now?: Date;
};

/**
 * Helper: Count people who are managers (have direct reports)
 */
function countManagers(_people: OrgPerson[]): number {
  // If people have managerId field, managers are those whose IDs are referenced by others
  // For now, we'll need to check if there's a managerId or directReports field
  // Since the current OrgPerson type doesn't have these, we'll return 0 for now
  // TODO [BACKLOG]: Use person.managerId to count managers (data now available)
  return 0;
}

/**
 * Helper: Count people who joined within the last N days
 */
function countNewJoiners(people: OrgPerson[], days: number = 30, now: Date = new Date()): number | null {
  if (!people || people.length === 0) return 0;
  
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  let hasStartDates = false;
  let count = 0;
  
  for (const person of people) {
    if (person.joinedAt) {
      hasStartDates = true;
      const joinedDate = new Date(person.joinedAt);
      if (joinedDate >= cutoffDate) {
        count++;
      }
    }
  }
  
  // If no one has a start date, return null to show "—"
  return hasStartDates ? count : null;
}

/**
 * Helper: Count people with role/team changes within the last N days
 */
function countRecentChanges(people: OrgPerson[], _days: number = 30, _now: Date = new Date()): number | null {
  // Since change history is not available in current data structure, return null
  // TODO [BACKLOG]: Implement when OrgAuditLog change history is populated
  return null;
}

/**
 * People insights metric cards component
 * Displays at-a-glance metrics for the People page
 */
export function PeopleInsights({ people, isLoading = false, now = new Date() }: PeopleInsightsProps) {
  const totalPeople = people.length;
  const managersCount = countManagers(people);
  const newJoiners = countNewJoiners(people, 30, now);
  const recentChanges = countRecentChanges(people, 30, now);

  const cards = [
    {
      label: "Total people",
      value: isLoading ? "–" : totalPeople.toString(),
      helper: "Active members",
      tooltip: "Total number of people in your organization. Counts reflect current filters.",
      emphasis: "high",
    },
    {
      label: "People managers",
      value: isLoading ? "–" : managersCount.toString(),
      helper: "With direct reports",
      tooltip: "Managers are people with at least one direct report.",
      emphasis: "high",
    },
    {
      label: "Joined (30d)",
      value: isLoading ? "–" : newJoiners === null ? "—" : newJoiners.toString(),
      helper: newJoiners === null ? "Start dates not set" : "New joiners",
      tooltip: newJoiners === null 
        ? "Start dates haven't been set for people yet." 
        : "People who joined in the last 30 days.",
      emphasis: "high",
    },
    {
      label: "Recent changes",
      value: isLoading ? "–" : recentChanges === null ? "—" : recentChanges.toString(),
      helper: recentChanges === null ? "Change history not enabled" : "Moved teams or roles",
      tooltip: recentChanges === null
        ? "Change history tracking is not enabled. Enable it in settings to track role and team changes over time."
        : "People who moved teams or changed roles in the last 30 days.",
      emphasis: "low",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const isHighEmphasis = card.emphasis === "high";
        const isLowEmphasis = card.emphasis === "low";
        
        return (
          <div
            key={card.label}
            className={cn(
              "rounded-3xl",
              "bg-card/80",
              "border",
              "p-4",
              "transition-all duration-200",
              "hover:border-white/10",
              "hover:-translate-y-[1px]",
              isHighEmphasis
                ? cn(
                    "border-white/8",
                    "shadow-[0_24px_80px_rgba(0,0,0,0.3)]",
                    "hover:shadow-[0_24px_80px_rgba(0,0,0,0.4)]"
                  )
                : isLowEmphasis
                ? cn(
                    "border-white/3",
                    "shadow-[0_16px_60px_rgba(0,0,0,0.2)]",
                    "opacity-70",
                    "hover:opacity-90"
                  )
                : cn(
                    "border-white/5",
                    "shadow-[0_24px_80px_rgba(0,0,0,0.25)]",
                    "hover:shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
                  )
            )}
          >
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                isLowEmphasis ? "text-slate-600" : "text-muted-foreground"
              )}>
                {card.label}
              </div>
              {card.tooltip && (
                <InfoTooltip content={card.tooltip} />
              )}
            </div>
            <div className={cn(
              "mt-2 text-[32px] font-bold tabular-nums leading-none",
              isLowEmphasis ? "text-muted-foreground" : "text-foreground"
            )}>
              {card.value}
            </div>
            <div className={cn(
              "mt-1.5 text-[11px]",
              isLowEmphasis ? "text-muted-foreground" : "text-muted-foreground"
            )}>
              {card.helper}
            </div>
          </div>
        );
      })}
    </div>
  );
}

