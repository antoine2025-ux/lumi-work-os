"use client";

import dynamic from "next/dynamic";
import type { OrgInsightsSnapshot } from "@/lib/org/insights";
import { OrgInsightsSummaryCards } from "./OrgInsightsSummaryCards";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

// Lazy-load: recharts (~7.7 MB source) only needed when charts scroll into view
const OrgInsightsChartsSection = dynamic(
  () => import("./OrgInsightsChartsSection").then(m => ({ default: m.OrgInsightsChartsSection })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-48 bg-muted rounded-lg" />
    ),
  }
);

type OrgInsightsViewProps = {
  insights: OrgInsightsSnapshot;
};

/**
 * Pure view component that renders insights data.
 * This component has no data fetching logic - it just displays what it receives.
 */
export function OrgInsightsView({ insights }: OrgInsightsViewProps) {
  // Check if we have any data
  if (!insights || insights.summary.totalPeople === 0) {
    return (
      <OrgEmptyState
        title="No insights yet"
        description="Insights will appear automatically once your workspace has members, teams, and activity."
      />
    );
  }

  // Generate department options for the charts section
  const departmentOptions = insights.byDepartment
    .slice()
    .sort((a, b) => b.headcount - a.headcount)
    .map((d) => ({
      id: d.departmentId,
      name: d.departmentName || "Unassigned",
    }));

  return (
    <div className="space-y-6">
      {/* Summary metrics cards */}
      <OrgInsightsSummaryCards snapshot={insights} />

      {/* Charts section - now receives snapshot directly */}
      <OrgInsightsChartsSection
        workspaceId={insights.workspaceId}
        snapshot={insights}
        departmentOptions={departmentOptions}
      />
    </div>
  );
}

