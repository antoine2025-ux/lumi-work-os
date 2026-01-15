"use client";

import { PermissionsOverview } from "./PermissionsOverview";
import { OrgPermissionsMatrix } from "./OrgPermissionsMatrix";
import { CustomRolesSection } from "./CustomRolesSection";
import { ROLE_CAPABILITIES } from "@/lib/org/capabilities";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";

type GeneralSettingsSectionProps = {
  orgId?: string;
};

export function GeneralSettingsSection({ orgId }: GeneralSettingsSectionProps) {
  const perms = useOrgPermissions();

  if (!orgId) {
    return (
      <div className="rounded-2xl border border-[#111827] bg-[#020617] p-4 text-xs text-slate-400">
        No organization selected.
      </div>
    );
  }

  // TODO (L9+): embed the real org settings forms here using orgId.
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#111827] bg-[#020617] p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-medium text-slate-100">General settings</h2>
          <p className="mt-1 text-xs text-slate-400">
            Configure organization name, branding, and other defaults.
          </p>
          <div className="mt-1 text-[11px] text-slate-500">
            General settings for org:{" "}
            <span className="font-mono text-slate-300">
              {orgId}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs text-slate-300">
          <div className="rounded-xl border border-[#111827] bg-[#020617] p-3">
            <div className="text-[11px] font-medium text-slate-400">Organization name</div>
            <div className="mt-1 text-slate-100">Loopwell</div>
            <div className="mt-2 rounded-lg border border-dashed border-[#1f2937] px-3 py-2 text-[11px] text-slate-500">
              TODO: embed existing org name update form / settings from L7/L8.
            </div>
          </div>

          <div className="rounded-xl border border-[#111827] bg-[#020617] p-3">
            <div className="text-[11px] font-medium text-slate-400">Branding</div>
            <div className="mt-1 text-slate-400">
              Future support for logo, colors, and other branding options will live here.
            </div>
          </div>
        </div>
      </div>

      <PermissionsOverview />

      <OrgPermissionsMatrix matrix={ROLE_CAPABILITIES} />

      <OrgCapabilityGate
        capability="org:org:update"
        permissions={perms}
        fallback={null}
      >
        <CustomRolesSection />
      </OrgCapabilityGate>
    </section>
  );
}

