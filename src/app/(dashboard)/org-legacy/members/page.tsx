import Link from "next/link";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { getOrgInvitationsForWorkspace } from "@/server/data/orgInvitations";
import { getWorkspaceForCurrentUser } from "@/server/data/workspace";
import { prisma } from "@/lib/db";
import { InviteMemberForm } from "@/components/org/invite-member-form";
import { CancelInvitationButton } from "@/components/org/cancel-invitation-button";
import { CopyInviteLinkButton } from "@/components/org/copy-invite-link-button";
import { MemberActions } from "@/components/org/member-actions";
import { LeaveOrgButton } from "@/components/org/leave-org-button";
import { DangerZone } from "@/components/org/danger-zone";
import { OrgActivityPanel } from "@/components/org/org-activity-panel";
import { getOrgActivityForWorkspace } from "@/server/data/orgActivity";
import { Toaster } from "@/components/ui/use-toast";
import { ROLE_CAPABILITIES, ORG_CAPABILITY_DESCRIPTIONS } from "@/lib/org/capabilities";
import { MembersListClient } from "@/components/org/members/MembersListClient";

export const dynamic = 'force-dynamic'

type OrgMembersScreenProps = {
  workspaceId: string;
};

/**
 * Reusable Org members screen.
 * This contains all the existing L7/L8 members logic (tables, actions, etc.)
 * and can be rendered both in the legacy dashboard route and in the new Org Center.
 */
export async function OrgMembersScreen({ workspaceId }: OrgMembersScreenProps) {
  const auth = await getUnifiedAuth();
  
  const workspace = await getWorkspaceForCurrentUser(workspaceId);
  
  if (!prisma) {
    throw new Error("Prisma client not available");
  }

  const [members, invitations, customRoles] = await Promise.all([
    (prisma.workspaceMember.findMany as any)({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // ADAPT: Include customRole if relation exists (after migrations)
        customRole: true,
      },
    }).catch((error: any) => {
      // If customRole relation doesn't exist yet, fetch without it
      if (error?.message?.includes('customRole')) {
        if (!prisma) throw new Error("Prisma client not available");
        return prisma.workspaceMember.findMany({
          where: { workspaceId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      }
      throw error;
    }),
    getOrgInvitationsForWorkspace(workspaceId),
    // ADAPT: After running migrations, this will work
    // Try to fetch custom roles, but handle gracefully if model doesn't exist yet
    (async () => {
      if (!prisma) return [];
      try {
        const roles = await (prisma as any).orgCustomRole.findMany({
          where: { workspaceId },
          select: {
            id: true,
            name: true,
          },
        });
        return roles;
      } catch (error: any) {
        // If model doesn't exist yet (before migrations), return empty array
        if (error?.message?.includes('orgCustomRole') || error?.code === 'P2025') {
          return [];
        }
        throw error;
      }
    })(),
  ]);

  // Check if current user is admin/owner
  const currentMember = members.find(
    (m) => m.userId === auth.user.userId
  );
  const viewerIsAdmin =
    currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  
  const viewerUserId = currentMember?.userId;
  const viewerIsOwner = !!viewerUserId && workspace.ownerId === viewerUserId;
  
  const activeInvites = invitations.filter((invitation) => invitation.status === "PENDING");
  const historyInvites = invitations.filter((invitation) => invitation.status !== "PENDING");

  // Compute metrics
  const totalMembers = members.length;
  const activeInvitesCount = activeInvites.length;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentlyAcceptedCount = invitations.filter((invitation) => {
    if (invitation.status !== "ACCEPTED") return false;
    if (!invitation.acceptedAt) return false;
    return new Date(invitation.acceptedAt) >= sevenDaysAgo;
  }).length;

  const transferTargets =
    viewerIsOwner && viewerUserId
      ? members
          .filter(
            (m) =>
              (m.role === "ADMIN" || m.role === "OWNER") &&
              m.user?.id &&
              m.user.id !== viewerUserId
          )
          .map((m: { id: string; user?: { name?: string | null; email?: string | null } | null }) => ({
            membershipId: m.id,
            label:
              m.user?.name ||
              m.user?.email ||
              "Admin",
          }))
      : [];

  // Fetch initial activity for admins
  let initialActivity = null;
  if (viewerIsAdmin) {
    try {
      const activity = await getOrgActivityForWorkspace({
        workspaceId,
        limit: 20,
      });

      initialActivity = {
        items: activity.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
        nextCursor: activity.nextCursor,
      };
    } catch (err) {
      console.error("[ORG_ACTIVITY_FETCH_ERROR]", err);
      initialActivity = null;
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Removed page-level header - OrgPageHeader handles the title now */}
      {viewerIsAdmin && (
        <div className="flex justify-end">
          <Link
            href="/org/settings/activity"
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            View activity →
          </Link>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Members
          </span>
          <span className="text-2xl font-semibold">{totalMembers}</span>
          <span className="text-xs text-muted-foreground">
            Active users in this organization
          </span>
        </div>

        <div className="rounded-lg border p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Active invites
          </span>
          <span className="text-2xl font-semibold">{activeInvitesCount}</span>
          <span className="text-xs text-muted-foreground">
            Pending invitations waiting for acceptance
          </span>
        </div>

        <div className="rounded-lg border p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Accepted (7 days)
          </span>
          <span className="text-2xl font-semibold">{recentlyAcceptedCount}</span>
          <span className="text-xs text-muted-foreground">
            Invites accepted in the last 7 days
          </span>
        </div>
      </section>

      <section className="space-y-4">
        <div className="border p-4 rounded-lg">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 mb-3">
            Members
          </p>

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members yet. Once you invite people and they accept, they will appear here.
            </p>
          ) : (
            <MembersListClient
              members={members as any}
              customRoles={customRoles}
              currentUserId={auth.user.userId}
            />
          )}
        </div>
      </section>

      {viewerIsAdmin && initialActivity && (
        <OrgActivityPanel
          workspaceId={workspaceId}
          initialItems={initialActivity.items}
          initialNextCursor={initialActivity.nextCursor}
        />
      )}

      <DangerZone
        workspaceId={workspaceId}
        workspaceName={workspace.name}
        isOwner={viewerIsOwner}
        transferTargets={transferTargets}
      />

      {viewerIsAdmin && (
        <section className="mt-8 border rounded-lg p-4 flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold">Workspace activity &amp; exports</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Need a deeper audit trail or CSV/JSON exports of what&apos;s been happening in this
              workspace? Open the full activity view in Org settings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/org/settings/activity"
              className="inline-flex items-center rounded-md border px-3 py-1.5 hover:bg-muted transition-colors"
            >
              Open activity &amp; export view
            </Link>
            <span className="text-[11px] text-muted-foreground">
              Includes filters, timeline, and export tools for admins.
            </span>
          </div>
        </section>
      )}

      <Toaster />
    </div>
  );
}

/**
 * Reusable Org invites screen.
 * Contains existing invites logic (form, pending list, history).
 */
export async function OrgInvitesScreen({ workspaceId }: { workspaceId: string }) {
  const auth = await getUnifiedAuth();
  
  const workspace = await getWorkspaceForCurrentUser(workspaceId);
  
  const [members, invitations] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    getOrgInvitationsForWorkspace(workspaceId),
  ]);

  // Check if current user is admin/owner
  const currentMember = members.find(
    (m) => m.userId === auth.user.userId
  );
  const viewerIsAdmin =
    currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  
  const activeInvites = invitations.filter((invitation) => invitation.status === "PENDING");
  const historyInvites = invitations.filter((invitation) => invitation.status !== "PENDING");

  return (
    <div className="p-4 space-y-4">
      {/* Removed page-level header - OrgPageHeader handles the title now */}
      <div className="border rounded-lg">
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 mb-3">
            Invitations
          </p>
          <div className="mb-4">
            {activeInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active invitations. Use the form below to invite people to this organization.
              </p>
            ) : (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Active invitations</h4>
                <ul className="space-y-2">
                  {activeInvites.map((invitation) => (
                    <li
                      key={invitation.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{invitation.email}</span>
                        <span className="text-xs text-muted-foreground">
                          Invited by{" "}
                          {invitation.invitedBy?.name ||
                            invitation.invitedBy?.email ||
                            "Unknown"}
                        </span>
                        {invitation.expiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Expires on{" "}
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            "bg-amber-100 text-amber-800",
                          ].join(" ")}
                        >
                          Pending
                        </span>

                        <CopyInviteLinkButton
                          token={invitation.token}
                          inviteUrl={invitation.inviteUrl}
                        />
                        <CancelInvitationButton
                          workspaceId={workspaceId}
                          invitationId={invitation.id}
                          email={invitation.email}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {historyInvites.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Invitation history</h4>
              <ul className="space-y-2">
                {historyInvites.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{invitation.email}</span>
                      <span className="text-xs text-muted-foreground">
                        Invited by{" "}
                        {invitation.invitedBy?.name ||
                          invitation.invitedBy?.email ||
                          "Unknown"}
                      </span>
                      {invitation.acceptedAt && (
                        <span className="text-xs text-muted-foreground">
                          Accepted on{" "}
                          {new Date(invitation.acceptedAt).toLocaleDateString()}
                        </span>
                      )}
                      {invitation.expiresAt && invitation.status === "EXPIRED" && (
                        <span className="text-xs text-muted-foreground">
                          Expired on{" "}
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          invitation.status === "ACCEPTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-800",
                        ].join(" ")}
                      >
                        {invitation.status === "PENDING"
                          ? "Pending"
                          : invitation.status === "ACCEPTED"
                          ? "Accepted"
                          : invitation.status === "EXPIRED"
                          ? "Expired"
                          : invitation.status === "REJECTED"
                          ? "Cancelled"
                          : invitation.status.toLowerCase()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {viewerIsAdmin && <InviteMemberForm workspaceId={workspaceId} />}
      </div>

      <Toaster />
    </div>
  );
}

/**
 * Legacy route wrapper.
 * Keeps the old route working by passing workspaceId from params
 * into OrgMembersScreen.
 */
type OrgMembersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: OrgMembersPageProps) {
  const workspaceId = await getCurrentWorkspaceId();
  return <OrgMembersScreen workspaceId={workspaceId} />;
}
