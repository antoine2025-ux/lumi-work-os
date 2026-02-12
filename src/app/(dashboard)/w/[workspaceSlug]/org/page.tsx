/**
 * Workspace-Scoped Org Entry — Role-Based Router
 *
 * Redirects to the appropriate landing page by role:
 * - OWNER/ADMIN → /w/[workspaceSlug]/org/admin
 * - MEMBER/VIEWER + team lead → /w/[workspaceSlug]/org/my-team
 * - Else → /w/[workspaceSlug]/org/profile
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
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
          breadcrumb="ORG"
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

  const isAdmin = context.role === "OWNER" || context.role === "ADMIN";
  const isTeamLead = !!(await prisma.orgTeam.findFirst({
    where: {
      leaderId: context.userId,
      workspaceId: context.orgId,
    },
  }));

  if (isAdmin) {
    redirect(`/w/${workspaceSlug}/org/admin`);
  }
  if (isTeamLead) {
    redirect(`/w/${workspaceSlug}/org/my-team`);
  }
  redirect(`/w/${workspaceSlug}/org/profile`);
}
