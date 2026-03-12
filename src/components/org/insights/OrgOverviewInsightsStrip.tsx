"use client";

import type { OrgInsightsSnapshot } from "@/lib/org/insights";
import { OrgInsightsSummaryCards } from "@/components/org/insights/OrgInsightsSummaryCards";
import Link from "next/link";

type Props = {
  snapshot: OrgInsightsSnapshot;
};

export function OrgOverviewInsightsStrip({ snapshot }: Props) {
  const empty =
    snapshot.summary.totalPeople === 0 &&
    snapshot.summary.totalTeams === 0 &&
    snapshot.summary.totalDepartments === 0;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-background px-4 py-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold text-foreground">
            Org insights
          </div>
          <p className="text-[11px] text-muted-foreground">
            At-a-glance metrics for this organization.
          </p>
        </div>
        {!empty && (
          <Link
            href="/org/insights"
            className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all →
          </Link>
        )}
      </div>
      {empty ? (
        <div className="py-4 text-[11px] text-muted-foreground">
          Insights will appear once your organization has people, teams or departments.
        </div>
      ) : (
        <OrgInsightsSummaryCards snapshot={snapshot} />
      )}
    </section>
  );
}

