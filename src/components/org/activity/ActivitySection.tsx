"use client";

import { memo } from "react";
import { OrgActivityPanel } from "@/components/org/org-activity-panel";
import { ActivityExportButtons } from "@/components/org/activity-export-buttons";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

type ActivitySectionProps = {
  orgId?: string;
  initialOrgActivity: {
    items: {
      id: string;
      workspaceId: string;
      event: string;
      actorUserId: string | null;
      targetUserId: string | null;
      actorName: string | null;
      actorEmail: string | null;
      targetName: string | null;
      targetEmail: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }[];
    nextCursor: string | null;
  } | null;
};

/**
 * Org Center → Activity & exports → Activity tab.
 *
 * Renders org activity using data loaded server-side to avoid Server Component issues.
 * Memoized to prevent unnecessary re-renders.
 */
export const ActivitySection = memo(function ActivitySection({ orgId, initialOrgActivity }: ActivitySectionProps) {
  if (!orgId) {
    return (
      <section className="rounded-2xl border border-border bg-background p-4 text-xs text-muted-foreground">
        No organization selected.
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-background p-2 shadow-sm">
      {initialOrgActivity ? (
        <>
          <ActivityExportButtons
            workspaceId={orgId}
            eventFilter="all"
            timeframe="30d"
          />
          <OrgActivityPanel
            workspaceId={orgId}
            initialItems={initialOrgActivity.items}
            initialNextCursor={initialOrgActivity.nextCursor}
            initialEventFilter="all"
            initialTimeframe="30d"
          />
        </>
      ) : (
        <div className="p-4">
          <OrgEmptyState
            title="No activity yet"
            description="Activity will appear here once people join, roles change, or exports are created."
          />
        </div>
      )}
    </section>
  );
});
