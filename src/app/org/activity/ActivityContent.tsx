/**
 * Server component that loads and renders Activity & Exports content.
 * Wrapped in Suspense to allow progressive loading.
 */

import { Suspense } from "react";
import { getOrgAdminActivity } from "@/lib/org/data.server";
import { getOrgActivityForWorkspace } from "@/server/data/orgActivity";
import { ActivityExportsClient } from "./ActivityExportsClient";
import { OrgActivityListSkeleton } from "@/components/org/skeletons/OrgActivitySkeleton";
import type { OrgPermissionContext } from "@/lib/org/permissions.server";

type ActivityContentProps = {
  context: OrgPermissionContext;
};

async function ActivityDataLoader({ context }: ActivityContentProps) {
  const startTime = process.env.NODE_ENV !== "production" ? Date.now() : 0;
  
  // Load all data server-side to avoid issues with Server Components in Suspense
  const [adminActivity, orgActivity] = await Promise.allSettled([
    getOrgAdminActivity(context.workspaceId, context.userId, 24),
    getOrgActivityForWorkspace({
      workspaceId: context.workspaceId,
      limit: 30,
      eventFilter: "all",
      timeframe: "30d",
    }).catch(() => null),
  ]);

  if (process.env.NODE_ENV !== "production" && startTime) {
    const duration = Date.now() - startTime;
    if (duration > 200) {
      console.log(`[ActivityPage] Data loading took ${duration}ms`);
    }
  }

  const adminActivityData = adminActivity.status === "fulfilled" ? adminActivity.value : [];
  const orgActivityData = orgActivity.status === "fulfilled" && orgActivity.value
    ? {
        items: orgActivity.value.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
        nextCursor: orgActivity.value.nextCursor,
      }
    : null;

  return (
    <ActivityExportsClient
      workspaceId={context.workspaceId}
      initialAdminActivity={adminActivityData}
      initialOrgActivity={orgActivityData}
      role={context.role}
    />
  );
}

export function ActivityContent({ context }: ActivityContentProps) {
  return (
    <Suspense
      fallback={
        <div className="px-10 pb-10">
          <OrgActivityListSkeleton />
        </div>
      }
    >
      <ActivityDataLoader context={context} />
    </Suspense>
  );
}

