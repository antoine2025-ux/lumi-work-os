/**
 * Workspace-Scoped Org People Page
 * 
 * MVP Purpose: Core MVP surface for viewing and managing people in the org.
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { PeopleListClient } from "@/components/org/PeopleListClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgPeoplePage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / PEOPLE"
          title="People"
          description="View and manage everyone in your organization."
        />
        <div className="px-10 pb-10">
          <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/60 px-6 py-6 text-[13px] text-yellow-100">
            <div className="font-semibold">No active organization</div>
            <div className="mt-2 text-yellow-200">
              Please select an organization to view people.
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <OrgPageViewTracker route={`/w/${workspaceSlug}/org/people`} name="Org People" />
      <OrgPageHeader
        breadcrumb="ORG / PEOPLE"
        title="People"
        description="View and manage everyone in your organization."
      />
      <div className="px-10 pb-10">
        <PeopleListClient />
      </div>
    </>
  );
}
