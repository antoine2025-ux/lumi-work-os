/**
 * Org Overview Page - Server Component
 * 
 * PERFORMANCE NOTE:
 * - getOrgPermissionContext() is cached per-request, so this call reuses
 *   the result from the layout (no duplicate database query).
 * - Heavy data loading is moved to OrgOverviewContent with Suspense boundary
 *   for progressive loading (page shell renders immediately, data loads async).
 */

// Internal docs:
// - Org Center tour: src/docs/org-center-tour.md
// - Org Center UX improvements: src/docs/org-center-ux-improvements.md

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OverviewSummaryCards } from "@/components/org/OverviewSummaryCards";
import { NextStepCard } from "@/components/org/NextStepCard";
import { OrgIntelligenceOverview } from "@/components/org/OrgIntelligenceOverview";
import { OrgSectionBoundary } from "@/components/org/OrgSectionBoundary";
import { OrgReadinessBanner } from "@/components/org/OrgReadinessBanner";
import { IntegrityBanner } from "@/components/org/IntegrityBanner";
import { RecommendationsOverview } from "@/components/org/recommendations";
import { CapacityOverviewCard } from "@/components/org/capacity/CapacityOverviewCard";
import { WorkOverviewCard } from "@/components/org/work/WorkOverviewCard";
import { OnboardingResumeCard } from "@/components/org/work/OnboardingResumeCard";
import { prisma } from "@/lib/db";

export default async function OrgOverviewPage() {
  try {
    // PERFORMANCE: This call is cached per-request, reusing layout's result
    const context = await getOrgPermissionContext().catch((error) => {
      console.error("[OrgOverviewPage] Error in getOrgPermissionContext:", error);
      return null;
    });
    if (!context) {
      return (
        <>
          <OrgPageHeader
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

    // O1: Check if onboarding is incomplete for OWNER users
    let showOnboardingResume = false;
    if (context.role === "OWNER" && prisma) {
      try {
        const workspace = await prisma.workspace.findUnique({
          where: { id: context.orgId },
          select: { orgCenterOnboardingCompletedAt: true },
        });
        showOnboardingResume = !workspace?.orgCenterOnboardingCompletedAt;
      } catch {
        // Non-blocking — don't break Overview if this fails
      }
    }

    return (
      <>
        <OrgPageViewTracker route="/org" name="Org Overview" />
        <OrgPageHeader
          title="Org overview"
          description="See a high-level view of your organization's people, teams, and structure."
        />
        <div className="px-10 pb-10 space-y-6">
          <OrgReadinessBanner onboardingIncomplete={showOnboardingResume} />
          <IntegrityBanner />
          {showOnboardingResume && <OnboardingResumeCard />}
          <OrgSectionBoundary title="Next step">
            <NextStepCard />
          </OrgSectionBoundary>
          <OrgSectionBoundary title="Overview">
            <OverviewSummaryCards />
          </OrgSectionBoundary>
          <OrgSectionBoundary title="Capacity">
            <CapacityOverviewCard />
          </OrgSectionBoundary>
          <OrgSectionBoundary title="Work">
            <WorkOverviewCard />
          </OrgSectionBoundary>
          <OrgSectionBoundary title="Recommendations">
            <RecommendationsOverview />
          </OrgSectionBoundary>
          <OrgSectionBoundary title="Intelligence">
            <OrgIntelligenceOverview />
          </OrgSectionBoundary>
        </div>
      </>
    );
  } catch (error: any) {
    console.error("[OrgOverviewPage] Unexpected error:", error);
    console.error("[OrgOverviewPage] Error stack:", error?.stack);
    console.error("[OrgOverviewPage] Error name:", error?.name);
    return (
      <>
        <OrgPageHeader
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
