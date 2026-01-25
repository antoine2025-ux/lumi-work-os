/**
 * Workspace-Scoped Org Overview Page
 * 
 * This is the canonical /w/[workspaceSlug]/org route that renders the NEW Org UI.
 * The layout.tsx handles permissions and workspace validation.
 * 
 * PERFORMANCE NOTE:
 * - getOrgPermissionContext() is cached per-request, reusing layout's result
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OverviewSummaryCards } from "@/components/org/OverviewSummaryCards";
import { NextStepCard } from "@/components/org/NextStepCard";
import { OrgIntelligenceOverview } from "@/components/org/OrgIntelligenceOverview";
import { OrgSectionBoundary } from "@/components/org/OrgSectionBoundary";
import { IntegrityBanner } from "@/components/org/IntegrityBanner";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgOverviewPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  
  try {
    // PERFORMANCE: This call is cached per-request, reusing layout's result
    const context = await getOrgPermissionContext().catch((error) => {
      console.error("[WorkspaceOrgOverviewPage] Error in getOrgPermissionContext:", error);
      return null;
    });
    
    if (!context) {
      return (
        <>
          <OrgPageHeader
            breadcrumb="ORG / OVERVIEW"
            title="Overview"
            description="See a high-level view of your organization's people, teams, and structure."
          />
          <div className="px-10 pb-10">
            <OrgEmptyState
              title="Get started with your organization"
              description="Create a workspace to start organizing your team, roles, and structure."
              primaryActionLabel="Create workspace"
              primaryActionHref="/welcome?from=org"
            />
          </div>
        </>
      );
    }

    return (
      <>
        <OrgPageViewTracker route={`/w/${workspaceSlug}/org`} name="Org Overview" />
        <OrgPageHeader
          breadcrumb="ORG / OVERVIEW"
          title="Org overview"
          description="See a high-level view of your organization's people, teams, and structure."
        />
        <div className="px-10 pb-10 space-y-6">
          <IntegrityBanner />
          <OrgSectionBoundary title="Next step">
            <NextStepCard />
          </OrgSectionBoundary>
          <OrgSectionBoundary title="Overview">
            <OverviewSummaryCards />
          </OrgSectionBoundary>
          <OrgSectionBoundary title="Intelligence">
            <OrgIntelligenceOverview />
          </OrgSectionBoundary>
        </div>
      </>
    );
  } catch (error: any) {
    console.error("[WorkspaceOrgOverviewPage] Unexpected error:", error);
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / OVERVIEW"
          title="Org overview"
          description="See a high-level view of your organization's people, teams, and structure."
        />
        <div className="px-10 pb-10">
          <div className="rounded-2xl border border-red-900/60 bg-red-950/60 px-6 py-6 text-[13px] text-red-100">
            <div className="font-semibold">Error loading org overview</div>
            <div className="mt-2 text-red-200">
              {error?.message || String(error) || "An unexpected error occurred. Please try refreshing the page."}
            </div>
            {process.env.NODE_ENV === "development" && error?.stack && (
              <pre className="mt-4 whitespace-pre-wrap text-xs opacity-75">
                {error.stack}
              </pre>
            )}
          </div>
        </div>
      </>
    );
  }
}
