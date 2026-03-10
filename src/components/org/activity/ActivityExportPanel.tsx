"use client";

import { useCallback } from "react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";

type ExportFormat = "csv" | "json";

export function ActivityExportPanel() {
  const { org, isLoading } = useCurrentOrg();
  const perms = useOrgPermissions();

  const handleDownload = useCallback(
    (format: ExportFormat) => {
      if (!org || typeof window === "undefined") return;
      const url = `/api/org/${org.id}/activity/export?format=${format}`;
      window.location.href = url;
    },
    [org]
  );

  const disabled = isLoading || !org;

  return (
    <OrgCapabilityGate
      capability="org:activity:export"
      permissions={perms}
      fallback={null}
    >
      <section className="space-y-2 rounded-2xl border border-border bg-background p-4 text-[11px] text-muted-foreground">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Activity export
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Download a snapshot of recent admin activity for this organization as CSV or JSON.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDownload("csv")}
          className="focus-ring inline-flex items-center justify-center rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download CSV
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDownload("json")}
          className="focus-ring inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-[#050816] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download JSON
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Exports are limited to the most recent entries (up to 500). For deeper history, pagination
        can be added later.
      </p>
    </section>
    </OrgCapabilityGate>
  );
}

