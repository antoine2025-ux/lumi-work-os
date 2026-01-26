"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { PermissionHint } from "@/components/org/permissions/PermissionHint";

type CustomRoleOption = {
  id: string;
  name: string;
};

type Props = {
  memberId: string;
  currentCustomRoleId: string | null;
  customRoleOptions: CustomRoleOption[];
};

export function CustomRoleSelector({
  memberId,
  currentCustomRoleId,
  customRoleOptions,
}: Props) {
  const router = useRouter();
  const perms = useOrgPermissions();
  const canChangeRoles = perms?.capabilities?.["org:member:role.change"] === true;
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newCustomRoleId: string | null) {
    setError(null);
    setUpdating(true);

    try {
      const res = await fetch(`/api/org/members/${memberId}/custom-role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customRoleId: newCustomRoleId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update custom role.");
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update custom role.");
    } finally {
      setUpdating(false);
    }
  }

  if (!canChangeRoles) {
    return <PermissionHint message="Only owners can assign custom roles." />;
  }

  if (customRoleOptions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="focus-ring rounded-full border border-slate-800 bg-[#020617] px-2 py-1 text-[11px] text-slate-200 transition-colors hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        value={currentCustomRoleId || ""}
        onChange={(e) => handleChange(e.target.value || null)}
        disabled={updating}
        aria-label={`Assign custom role to member`}
      >
        <option value="">No custom role</option>
        {customRoleOptions.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {updating && (
        <span className="text-[10px] text-slate-500">Updating…</span>
      )}
      {error && (
        <span className="text-[10px] text-red-400">{error}</span>
      )}
    </div>
  );
}

