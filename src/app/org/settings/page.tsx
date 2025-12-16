import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { OrgSettingsClient } from "./OrgSettingsClient";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { prisma } from "@/lib/db";
import { getOrgInvitationsForWorkspace } from "@/server/data/orgInvitations";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export default async function OrgSettingsPage() {
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / ORG SETTINGS"
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

  // Get current user ID for MembersListClient
  const currentUserId = await getCurrentUserId().catch(() => "");

  // Load members and invitations server-side to avoid Server Component issues
  const [membersData, invitationsData, customRolesData] = await Promise.allSettled([
    canSeeMembers
      ? prisma.workspaceMember
          .findMany({
            where: { workspaceId: context.orgId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              customRole: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
    canManageInvites
      ? getOrgInvitationsForWorkspace(context.orgId).catch(() => [])
      : Promise.resolve([]),
    // Try to fetch custom roles, but handle gracefully if model doesn't exist yet
    (async () => {
      try {
        return await (prisma as any).orgCustomRole.findMany({
          where: { workspaceId: context.orgId },
          select: {
            id: true,
            name: true,
          },
        });
      } catch (error: any) {
        if (error?.message?.includes("orgCustomRole") || error?.code === "P2025") {
          return [];
        }
        return [];
      }
    })(),
  ]);

  const members =
    membersData.status === "fulfilled" ? membersData.value : [];
  const invitations =
    invitationsData.status === "fulfilled" ? invitationsData.value : [];
  const customRoles =
    customRolesData.status === "fulfilled" ? customRolesData.value : [];

  return (
    <>
      <OrgPageViewTracker route="/org/settings" name="Org Settings" />
      <OrgSettingsClient
        orgId={context.orgId}
        role={context.role}
        canSeeMembers={canSeeMembers}
        canManageInvites={canManageInvites}
        canSeeDanger={canSeeDanger}
        currentUserId={currentUserId}
        initialMembers={members}
        initialInvitations={invitations}
        initialCustomRoles={customRoles}
      />
    </>
  );
}
