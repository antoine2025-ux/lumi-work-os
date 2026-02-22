"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useApiAction } from "@/hooks/useApiAction";
import { orgApi } from "@/lib/orgApi";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";

type MemberActionsProps = {
  workspaceId: string;
  membershipId: string;
  currentRole: "ADMIN" | "MEMBER" | "OWNER";
  memberLabel: string; // e.g. name or email
};

const ROLE_OPTIONS: Array<"ADMIN" | "MEMBER"> = ["ADMIN", "MEMBER"];

export function MemberActions({
  workspaceId,
  membershipId,
  currentRole,
  memberLabel,
}: MemberActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const perms = useOrgPermissions();

  const [role, setRole] = useState<"ADMIN" | "MEMBER">(
    currentRole === "OWNER" ? "ADMIN" : currentRole
  );
  const [updatingRole, setUpdatingRole] = useState(false);
  const [removing, setRemoving] = useState(false);

  const updateRoleAction = useApiAction<
    Record<string, never>,
    { workspaceId: string; membershipId: string; role: "ADMIN" | "MEMBER" }
  >(orgApi.memberUpdateRole());

  const removeMemberAction = useApiAction<
    Record<string, never>,
    { workspaceId: string; membershipId: string }
  >(orgApi.memberRemove());

  async function handleRoleChange(nextRole: "ADMIN" | "MEMBER") {
    if (nextRole === role || updatingRole || removing) return;

    setUpdatingRole(true);
    try {
      const { error } = await updateRoleAction.run({
        workspaceId,
        membershipId,
        role: nextRole,
      });

      if (error) {
        // Reset select back to previous role if failed.
        setRole(currentRole === "OWNER" ? "ADMIN" : currentRole);
        return;
      }

      setRole(nextRole);
      toast({
        title: "Role updated",
        description: `${memberLabel} is now ${nextRole.toLowerCase()}.`,
      });

      router.refresh();
    } finally {
      setUpdatingRole(false);
    }
  }

  async function handleRemove() {
    if (removing || updatingRole) return;

    const confirmed = window.confirm(
      `Remove ${memberLabel} from this organization? This action cannot be undone.`
    );
    if (!confirmed) return;

    setRemoving(true);
    try {
      const { error } = await removeMemberAction.run({
        workspaceId,
        membershipId,
      });

      if (error) {
        return;
      }

      toast({
        title: "Member removed",
        description: `${memberLabel} has been removed from this organization and will no longer have access.`,
      });

      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  const disabled = updatingRole || removing;

  return (
    <div className="flex items-center gap-2">
      <OrgCapabilityGate
        capability="org:member:role.change"
        permissions={perms}
        fallback={null}
      >
        <select
          className="text-xs rounded-md border px-2 py-1 bg-background"
          value={role}
          disabled={disabled || currentRole === "OWNER"}
          onChange={(e) =>
            handleRoleChange(e.target.value as "ADMIN" | "MEMBER")
          }
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "ADMIN" ? "Admin" : "Member"}
            </option>
          ))}
        </select>
      </OrgCapabilityGate>

      <OrgCapabilityGate
        capability="org:member:remove"
        permissions={perms}
        fallback={null}
      >
        <button
          type="button"
          className="text-xs px-2 py-1 border rounded-md hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
          onClick={handleRemove}
          disabled={disabled || currentRole === "OWNER"}
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      </OrgCapabilityGate>
    </div>
  );
}

