"use client";

import { PermissionsOverview } from "./PermissionsOverview";
import { OrgPermissionsMatrix } from "./OrgPermissionsMatrix";
import { CustomRolesSection } from "./CustomRolesSection";
import { ROLE_CAPABILITIES } from "@/lib/org/capabilities";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import type { OrgClientPermissions } from "@/lib/org/permissions.client";

type GeneralSettingsSectionProps = {
  orgId?: string;
  permissions: OrgClientPermissions | null;
};

export function GeneralSettingsSection({ orgId, permissions }: GeneralSettingsSectionProps) {
  if (!orgId) {
    return (
      <div className="rounded-2xl border border-border bg-background p-4 text-xs text-muted-foreground">
        No organization selected.
      </div>
    );
  }

  // TODO [BACKLOG]: Embed the real org settings forms here using workspaceId (was orgId).
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-medium text-foreground">General settings</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure organization name, branding, and other defaults.
          </p>
          <div className="mt-1 text-[11px] text-muted-foreground">
            General settings for org:{" "}
            <span className="font-mono text-muted-foreground">
              {orgId}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs text-muted-foreground">
          <div className="rounded-xl border border-border bg-background p-3">
            <div className="text-[11px] font-medium text-muted-foreground">Organization name</div>
            <div className="mt-1 text-foreground">Loopwell</div>
            <div className="mt-2 rounded-lg border border-dashed border-[#1f2937] px-3 py-2 text-[11px] text-muted-foreground">
              TODO [BACKLOG]: Embed existing org name update form / settings from L7/L8.
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-3">
            <div className="text-[11px] font-medium text-muted-foreground">Branding</div>
            <div className="mt-1 text-muted-foreground">
              Future support for logo, colors, and other branding options will live here.
            </div>
          </div>
        </div>
      </div>

      <PermissionsOverview />

      <OrgPermissionsMatrix matrix={ROLE_CAPABILITIES} />

      <OrgCapabilityGate
        capability="org:settings:manage"
        permissions={permissions}
        fallback={null}
      >
        <CustomRolesSection />
      </OrgCapabilityGate>
    </section>
  );
}

