/**
 * Workspace-Scoped Org Settings Page
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { OrgSettingsClient } from "@/app/org/settings/OrgSettingsClient";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { prisma } from "@/lib/db";
import { getOrgInvitationsForWorkspace } from "@/server/data/orgInvitations";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgSettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / SETTINGS"
          title="Org settings"
          description="Manage this organization's members, invites, and configuration."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="No organization selected"
            description="You need to create or select a workspace to access settings."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome"
          />
        </div>
      </>
    );
  }

  const canSeeMembers = hasOrgCapability(context.role, "org:member:list");
  const canManageInvites = hasOrgCapability(context.role, "org:member:invite");
  const canSeeDanger = hasOrgCapability(context.role, "org:org:delete");

  const currentUserId = await getCurrentUserId().catch(() => "");

  const [membersData, invitationsData, customRolesData] = await Promise.allSettled([
    canSeeMembers
      ? (prisma.workspaceMember.findMany as Function)({
          where: { workspaceId: context.orgId },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            customRole: {
              select: { id: true, name: true },
            },
          },
        }).catch(() => [])
      : Promise.resolve([]),
    canManageInvites
      ? getOrgInvitationsForWorkspace(context.orgId).catch(() => [])
      : Promise.resolve([]),
    (async () => {
      try {
        return await (prisma as any).orgCustomRole.findMany({
          where: { workspaceId: context.orgId },
          select: { id: true, name: true },
        });
      } catch {
        return [];
      }
    })(),
  ]);

  const members = membersData.status === "fulfilled" ? membersData.value : [];
  const invitations = invitationsData.status === "fulfilled" ? invitationsData.value : [];
  const customRoles = customRolesData.status === "fulfilled" ? customRolesData.value : [];

  return (
    <>
      <OrgPageViewTracker route={`/w/${workspaceSlug}/org/settings`} name="Org Settings" />
      <OrgSettingsClient
        orgId={context.orgId}
        role={context.role}
        canSeeMembers={canSeeMembers}
        canManageInvites={canManageInvites}
        canSeeDanger={canSeeDanger}
        currentUserId={currentUserId || undefined}
        initialMembers={members}
        initialInvitations={invitations}
        initialCustomRoles={customRoles}
      />
    </>
  );
}
