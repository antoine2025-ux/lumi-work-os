"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { hasOrgCapability } from "@/lib/org/capabilities";

type DangerZoneSectionProps = {
  orgId?: string;
};

export function DangerZoneSection({ orgId }: DangerZoneSectionProps) {
  const perms = useOrgPermissions();
  const { org } = useCurrentOrg();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteOrg() {
    if (!org) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${org.name}"? This will permanently delete this organization and all its data. This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/org/danger", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error?.message || "Failed to delete org.");
        return;
      }

      // Redirect to a neutral page (e.g., main dashboard or org selection)
      window.location.href = "/";
    } catch (error) {
      console.error("[DangerZoneSection] Failed to delete org:", error);
      alert("Failed to delete org. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const canAccessDangerZone = perms && hasOrgCapability(perms.role, "org:org:delete");

  if (!canAccessDangerZone) {
    return (
      <div className="rounded-lg border border-slate-800 bg-[#020617] p-4 text-[13px] text-slate-400">
        You do not have permission to access dangerous organization settings.  
        Only Owners can perform destructive actions like deleting the org.
      </div>
    );
  }

  return (
    <OrgCapabilityGate
      capability="org:org:delete"
      permissions={perms}
      fallback={
        <div className="rounded-xl border border-red-900/40 bg-[#020617] px-4 py-4 text-[11px] text-slate-400">
          Only org owners can see and manage the danger zone settings.
        </div>
      }
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-red-300">Danger zone</h2>
          <p className="mt-1 text-xs text-slate-400">
            Actions here are permanent and affect the entire organization. Make sure you understand the impact before proceeding.
          </p>
        </div>

        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 shadow-sm">
          <h3 className="text-sm font-medium text-red-400">Transfer ownership</h3>
          <p className="mt-1 text-xs text-slate-100">
            Transfer organization ownership to another admin. This action is sensitive and should be
            done carefully.
          </p>
          {orgId && (
            <div className="mt-1 text-[11px] text-red-200">
              Current org: <span className="font-mono">{orgId}</span>
            </div>
          )}
          <div className="mt-3 rounded-lg border border-dashed border-red-900/70 bg-red-950/60 px-3 py-2 text-[11px] text-red-100">
            TODO: embed the existing ownership transfer flow from the L7 danger-zone implementation.
          </div>
        </div>

        <div className="rounded-xl border border-red-900/60 bg-[#020617] px-4 py-5">
          <div className="mb-1 text-sm font-semibold text-red-400">
            Danger zone
          </div>
          <p className="mb-3 text-[11px] text-slate-400">
            Deleting this org will permanently remove org data. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={handleDeleteOrg}
            disabled={deleting || !org}
            className="rounded-full border border-red-500 px-4 py-1.5 text-[12px] font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting…" : "Delete organization"}
          </button>
        </div>
      </section>
    </OrgCapabilityGate>
  );
}

