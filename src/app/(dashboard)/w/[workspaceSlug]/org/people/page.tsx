/**
 * Workspace-Scoped Org People Page
 * 
 * MVP Purpose: Core MVP surface for viewing and managing people in the org.
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { PeopleListClient } from "@/components/org/PeopleListClient";
import { getOrgInvitationsForWorkspace } from "@/server/data/orgInvitations";
import { prisma } from "@/lib/db";

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
          legacyBreadcrumb="ORG / PEOPLE"
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

  const pendingInvitations = await getOrgInvitationsForWorkspace(context.workspaceId).catch(
    () => []
  );
  const pendingOnly = pendingInvitations.filter((i) => i.status === "PENDING");

  // Enrich invitations with department, team, manager, job description names
  const deptIds = [...new Set(pendingOnly.map((i) => i.departmentId).filter(Boolean))] as string[];
  const teamIds = [...new Set(pendingOnly.map((i) => i.teamId).filter(Boolean))] as string[];
  const managerIds = [...new Set(pendingOnly.map((i) => i.managerId).filter(Boolean))] as string[];
  const jdIds = [...new Set(pendingOnly.map((i) => i.jobDescriptionId).filter(Boolean))] as string[];

  const [departments, teams, managerPositions, jobDescriptions] = await Promise.all([
    deptIds.length > 0
      ? prisma.orgDepartment.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true },
        })
      : [],
    teamIds.length > 0
      ? prisma.orgTeam.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, name: true },
        })
      : [],
    managerIds.length > 0
      ? prisma.orgPosition.findMany({
          where: { id: { in: managerIds } },
          select: { id: true, user: { select: { name: true, email: true } } },
        })
      : [],
    jdIds.length > 0
      ? prisma.jobDescription.findMany({
          where: { id: { in: jdIds } },
          select: { id: true, title: true },
        })
      : [],
  ]);

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));
  const managerMap = new Map(
    managerPositions.map((p) => [
      p.id,
      p.user?.name ?? p.user?.email ?? "Unknown",
    ])
  );
  const jdMap = new Map(jobDescriptions.map((j) => [j.id, j.title]));

  const enrichedInvitations = pendingOnly.map((inv) => ({
    ...inv,
    departmentName: inv.departmentId ? deptMap.get(inv.departmentId) ?? null : null,
    teamName: inv.teamId ? teamMap.get(inv.teamId) ?? null : null,
    managerName: inv.managerId ? managerMap.get(inv.managerId) ?? null : null,
    jobDescriptionTitle: inv.jobDescriptionId
      ? jdMap.get(inv.jobDescriptionId) ?? null
      : null,
  }));

  return (
    <>
      <OrgPageViewTracker route={`/w/${workspaceSlug}/org/people`} name="Org People" />
      <OrgPageHeader
        legacyBreadcrumb="ORG / PEOPLE"
        title="People"
        description="View and manage everyone in your organization."
      />
      <div className="px-10 pb-10">
        <PeopleListClient
          workspaceId={context.workspaceId}
          initialInvitations={enrichedInvitations}
        />
      </div>
    </>
  );
}
