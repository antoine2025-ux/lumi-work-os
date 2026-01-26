/**
 * Intelligence Drilldown Page
 *
 * Dynamic route for section-specific drilldown views.
 * Routes: /org/intelligence/ownership, /org/intelligence/capacity, etc.
 *
 * Read-only, issues-first, table-based layout.
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageHeader, resolveBackAction } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { IntelligenceDrilldownClient } from "@/components/org/intelligence/IntelligenceDrilldownClient";
import {
  SECTION_CONFIG,
  isValidSectionKey,
  type IntelligenceSectionKey,
} from "@/lib/org/intelligence/sections";

export const dynamic = "force-dynamic";

export default async function IntelligenceDrilldownPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { section } = await params;
  const resolvedSearchParams = await searchParams;
  const fromParam = resolvedSearchParams.from || null;

  // Validate section param
  if (!isValidSectionKey(section)) {
    redirect("/org/intelligence");
  }

  const config = SECTION_CONFIG[section as IntelligenceSectionKey];

  // Resolve back action based on from param or fallback to Intelligence
  const resolvedBackAction = fromParam ? resolveBackAction(fromParam) : null;
  const defaultBackAction = {
    label: "Back to Intelligence",
    href: "/org/intelligence",
  };
  const backAction = resolvedBackAction || defaultBackAction;

  // Get org context
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          title={config.label}
          description={config.description}
          backAction={backAction}
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="No organization selected"
            description="You need to create or select a workspace to access Intelligence."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome"
          />
        </div>
      </>
    );
  }

  const isAdmin = context.role === "ADMIN" || context.role === "OWNER";

  // Check admin-only sections
  if (config.requiresAdmin && !isAdmin) {
    return (
      <>
        <OrgPageHeader
          title={config.label}
          description={config.description}
          backAction={backAction}
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="Access restricted"
            description="This section requires admin or owner permissions."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <OrgPageViewTracker
        route={`/org/intelligence/${section}`}
        name={`Intelligence: ${config.label}`}
      />
      <OrgPageHeader
        title={config.label}
        description={config.description}
        backAction={backAction}
      />
      <div className="px-10 pb-10">
        <IntelligenceDrilldownClient
          section={section as IntelligenceSectionKey}
          isAdmin={isAdmin}
        />
      </div>
    </>
  );
}
