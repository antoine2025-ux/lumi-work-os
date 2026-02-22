"use client";

import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { MembersListClient } from "@/components/org/members/MembersListClient";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

type MembersSectionProps = {
  orgId?: string;
  currentUserId?: string;
  initialMembers?: any[];
  initialCustomRoles?: any[];
};

/**
 * Org Center → Settings → Members tab.
 *
 * Renders members using data loaded server-side to avoid Server Component issues.
 */
export function MembersSection({
  orgId,
  currentUserId = "",
  initialMembers = [],
  initialCustomRoles = [],
}: MembersSectionProps) {
  const perms = useOrgPermissions();

  if (!orgId) {
    return (
      <div className="rounded-2xl border border-[#111827] bg-[#020617] p-4 text-xs text-slate-400">
        No organization selected.
      </div>
    );
  }

  return (
    <OrgCapabilityGate
      capability="org:member:list"
      permissions={perms}
      fallback={
        <div className="rounded-2xl border border-[#111827] bg-[#020617] p-4 text-xs text-slate-300">
          You don&apos;t have permission to manage members in this org.
        </div>
      }
    >
      <section className="rounded-2xl border border-[#111827] bg-[#020617] p-4 shadow-sm">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
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
