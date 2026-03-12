"use client";

import type { OrgInsightsSnapshot } from "@/lib/org/insights";

type Props = {
  snapshot: OrgInsightsSnapshot;
};

export function OrgInsightsSummaryCards({ snapshot }: Props) {
  const { summary } = snapshot;

  const cards = [
    {
      label: "People",
      value: summary.totalPeople,
      helper: "Current members in this org",
    },
    {
      label: "Teams",
      value: summary.totalTeams,
      helper: "Active teams",
    },
    {
      label: "Departments",
      value: summary.totalDepartments,
      helper: "Active departments",
    },
    {
      label: "Roles",
      value: summary.totalRoles,
      helper: "Active roles",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-border bg-background px-4 py-4 shadow-sm shadow-slate-950/40 transition-all duration-150 hover:-translate-y-[1px] hover:border-border hover:shadow-md"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {card.label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">
            {card.value}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {card.helper}
          </div>
        </div>
      ))}
    </div>
  );
}

