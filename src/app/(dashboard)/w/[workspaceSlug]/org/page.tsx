/**
 * Workspace-Scoped Org Entry — Always redirects to My Profile
 *
 * When a user clicks Org, they are sent to My Profile as the default first page.
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgPage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  const context = await getOrgPermissionContext().catch((error) => {
    console.error("[WorkspaceOrgPage] Error in getOrgPermissionContext:", error);
    return null;
  });

  if (!context) {
    return (
      <>
        <OrgPageHeader
          legacyBreadcrumb="ORG"
          title="Org"
          description="See your organization's people, teams, and structure."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="Get started with your organization"
            description="Create a workspace to start organizing your team, roles, and structure."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome?from=org"
          />
        </div>
      </>
    );
  }

  redirect(`/w/${workspaceSlug}/org/profile`);
}
