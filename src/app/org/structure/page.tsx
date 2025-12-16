/**
 * Org Structure Page - Server Component
 * 
 * PERFORMANCE NOTE:
 * - getOrgPermissionContext() is cached per-request, reusing layout's result.
 * - Heavy structure data loading is moved to StructureContent with Suspense
 *   for progressive loading (header renders immediately, structure loads async).
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { StructureContent } from "./StructureContent";

export default async function StructurePage() {
  // PERFORMANCE: This call is cached per-request, reusing layout's result
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / STRUCTURE"
          title="Structure"
          description="Manage departments, teams, and roles so everyone understands how work is organized."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="No organization selected"
            description="You need to create or select a workspace to view structure."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <OrgPageViewTracker route="/org/structure" name="Org Structure" />
      <OrgPageHeader
        breadcrumb="ORG / STRUCTURE"
        title="Structure"
        description="Manage departments, teams, and roles so everyone understands how work is organized."
      />
      <StructureContent context={context} />
    </>
  );
}
