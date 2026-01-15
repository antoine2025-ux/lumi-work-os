/**
 * Server component that loads and renders People directory content.
 * Wrapped in Suspense to allow progressive loading.
 */

import { Suspense } from "react";
import { getOrgPeople } from "@/lib/org/data.server";
import PeopleClient from "@/app/(dashboard)/org-legacy/people/people.client";
import { OrgPeopleTableSkeleton } from "@/components/org/skeletons/OrgPeopleSkeleton";
import type { OrgPermissionContext } from "@/lib/org/permissions.server";

type PeopleContentProps = {
  context: OrgPermissionContext;
};

async function PeopleDataLoader({ context }: PeopleContentProps) {
  const startTime = process.env.NODE_ENV !== "production" ? Date.now() : 0;
  
  const result = await getOrgPeople(context.orgId, context.userId, { page: 1, limit: 50 }).catch((error) => {
    console.error("[PeoplePage] Failed to load people:", error);
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    };
  });

  if (process.env.NODE_ENV !== "production" && startTime) {
    const duration = Date.now() - startTime;
    if (duration > 200) {
      console.log(`[PeoplePage] Data loading took ${duration}ms`);
    }
  }

  // Convert OrgPerson[] to PersonRow[] format expected by PeopleClient
  const initialPeople = result.items.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email || null,
    title: p.role || null,
    roleName: p.role || null,
    teamName: p.team || null,
    managerId: null, // Will be loaded client-side
    createdAt: p.joinedAt || undefined,
  }));

  return <PeopleClient orgId={context.orgId} initialPeople={initialPeople} />;
}

export function PeopleContent({ context }: PeopleContentProps) {
  return (
    <Suspense
      fallback={
        <div className="px-10 pb-10">
          <OrgPeopleTableSkeleton />
        </div>
      }
    >
      <PeopleDataLoader context={context} />
    </Suspense>
  );
}

