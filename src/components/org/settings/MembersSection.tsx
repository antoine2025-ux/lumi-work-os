"use client";

import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { MembersListClient } from "@/components/org/members/MembersListClient";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

export type Member = {
  id: string;
  userId: string;
  role: string;
  customRoleId?: string | null;
  customRole?: {
    id: string;
    name: string;
    capabilities?: string[];
  } | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type MembersSectionProps = {
  workspaceId?: string;
  currentUserId?: string;
  initialMembers?: Member[];
  initialCustomRoles?: Array<{ id: string; name: string }>;
};

/**
 * Org Center → Settings → Members tab.
 *
 * Renders members using data loaded server-side to avoid Server Component issues.
 */
export function MembersSection({
  workspaceId,
  currentUserId = "",
  initialMembers = [],
  initialCustomRoles = [],
}: MembersSectionProps) {
  const perms = useOrgPermissions();

  if (!workspaceId) {
    return (
      <div className="rounded-2xl border border-border bg-background p-4 text-xs text-muted-foreground">
        No organization selected.
      </div>
    );
  }

  return (
    <OrgCapabilityGate
      capability="org:member:list"
      permissions={perms}
      fallback={
        <div className="rounded-2xl border border-border bg-background p-4 text-xs text-muted-foreground">
          You don&apos;t have permission to manage members in this org.
        </div>
      }
    >
      <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Members
          </p>
        </div>

        {initialMembers.length === 0 ? (
          <OrgEmptyState
            title="No members yet"
            description="Invite teammates to this organization so they can access Spaces, Loopbrain, and Org insights."
            primaryActionLabel="Invite member"
            primaryActionHref="/org/workspace-settings?tab=invites"
          />
        ) : (
          <MembersListClient
            members={initialMembers}
            customRoles={initialCustomRoles}
            currentUserId={currentUserId}
          />
        )}
      </section>
    </OrgCapabilityGate>
  );
}
