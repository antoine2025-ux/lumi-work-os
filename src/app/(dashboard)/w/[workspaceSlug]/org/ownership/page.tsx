/**
 * Workspace-Scoped Org Ownership Page
 * 
 * MVP Purpose: Show ownership coverage and unowned entities.
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { OwnershipClient } from "@/components/org/OwnershipClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgOwnershipPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  
  try {
    const context = await getOrgPermissionContext();
    if (!context) {
      return (
        <>
          <OrgPageHeader
            breadcrumb="ORG / OWNERSHIP"
            title="Ownership"
            description="Ownership shows whether every team and domain has a clear accountable owner."
          />
          <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
            <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/60 px-6 py-6 text-[13px] text-yellow-100">
              <div className="font-semibold">No active organization</div>
              <div className="mt-2 text-yellow-200">
                Please select an organization to view ownership data.
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <OrgPageViewTracker route={`/w/${workspaceSlug}/org/ownership`} name="Org Ownership" />
        <OrgPageHeader
          breadcrumb="ORG / OWNERSHIP"
          title="Ownership"
          description="Ownership shows whether every team and domain has a clear accountable owner."
        />
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
          <OwnershipClient />
        </div>
      </>
    );
  } catch (error: any) {
    if (error?.digest === "NEXT_REDIRECT" || error?.message === "NEXT_REDIRECT") {
      throw error;
    }

    console.error("[WorkspaceOrgOwnershipPage] Error:", error);
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / OWNERSHIP"
          title="Ownership"
          description="Ownership shows whether every team and domain has a clear accountable owner."
        />
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
          <div className="rounded-2xl border border-red-900/60 bg-red-950/60 px-6 py-6 text-[13px] text-red-100">
            <div className="font-semibold">Error loading ownership data</div>
            <div className="mt-2 text-red-200">
              {error?.message || "An unexpected error occurred."}
            </div>
          </div>
        </div>
      </>
    );
  }
}
