/**
 * Org Center Layout - Server Component
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Loads org permission context once per request (cached via React.cache())
 * - Provides context to all child pages to avoid duplicate permission checks
 * - All pages can access context without re-calling getOrgPermissionContext()
 */

import type { ReactNode } from "react";
import { Suspense } from "react";
import { OrgPermissionsProvider } from "@/components/org/OrgPermissionsContext";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgLayoutClient } from "@/components/org/OrgLayoutClient";
import {
  isOrgCenterEnabled,
  isOrgCenterBeta,
  isOrgCenterForceDisabled,
} from "@/lib/org/feature-flags";
import { OrgWelcomeOverlay } from "@/components/org/onboarding/OrgWelcomeOverlay";
import { OrgCenterDisabled } from "@/components/org/OrgCenterDisabled";
import { OrgAnnouncementBanner } from "@/components/org/OrgAnnouncementBanner";
import { prisma } from "@/lib/db";

type OrgLayoutProps = {
  children: ReactNode;
};

export default async function OrgLayout({ children }: OrgLayoutProps) {
  try {
    // Emergency force-disable check (highest priority)
    if (isOrgCenterForceDisabled()) {
      return (
        <div className="flex min-h-screen flex-col bg-[#020617]">
          <OrgCenterDisabled />
        </div>
      );
    }

    // Feature flag check: if Org Center is disabled, show a simple message
    if (!isOrgCenterEnabled()) {
      return (
        <div className="flex min-h-screen flex-col bg-[#020617]">
          <div className="px-10 pt-10">
            <div className="max-w-lg rounded-2xl border border-slate-800 bg-[#020617] px-6 py-6 text-[13px] text-slate-200">
              <div className="mb-1 text-[14px] font-semibold text-slate-50">
                Org Center is not available
              </div>
              <p className="text-[11px] text-slate-500">
                Org Center is currently turned off for this environment. Please contact the team if you believe this is a mistake.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Fetch server-side permission context (userId, orgId, role)
    // This already handles auto-selection via getOrgAndMembershipForUser
    // PERFORMANCE: This is cached per-request via React.cache(), so child pages
    // that also call getOrgPermissionContext() will get the cached result.
    const startTime = process.env.NODE_ENV !== "production" ? Date.now() : 0;
    const context = await getOrgPermissionContext();
    if (process.env.NODE_ENV !== "production" && startTime) {
      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.log(`[OrgLayout] getOrgPermissionContext took ${duration}ms`);
      }
    }

    // Map to the lightweight client shape
    const clientPermissions = context
      ? { role: context.role }
      : null;

    // If no context, check if user is signed in but has no org
    if (!context) {
      // Try to determine if it's an auth issue vs no org issue
      try {
        const userId = await import("@/lib/auth/getCurrentUserId").then(m => m.getCurrentUserId());
        if (!userId) {
          return (
            <div className="flex min-h-screen flex-col bg-[#020617]">
              <div className="px-10 pt-10">
                <div className="max-w-lg rounded-2xl border border-slate-800 bg-[#020617] px-6 py-6 text-[13px] text-slate-200">
                  <div className="mb-1 text-[14px] font-semibold text-slate-50">
                    You're not signed in
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sign in to access your organization's Org Center.
                  </p>
                </div>
              </div>
            </div>
          );
        }

        // User is signed in but has no org membership
        return (
          <div className="flex min-h-screen flex-col bg-[#020617]">
            <div className="px-10 pt-10">
              <div className="max-w-xl rounded-2xl border border-slate-800 bg-[#020617] px-6 py-6 text-[13px] text-slate-200">
                <div className="mb-1 text-[14px] font-semibold text-slate-50">
                  No organization selected
                </div>
                <p className="text-[11px] text-slate-500">
                  You need to create or select a workspace to use the Org Center.
                </p>
                <a
                  href="/welcome"
                  className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] text-white hover:bg-blue-500 transition-colors"
                >
                  Create workspace
                </a>
              </div>
            </div>
          </div>
        );
      } catch {
        // Fallback if we can't determine auth state
        return (
          <div className="flex min-h-screen flex-col bg-[#020617]">
            <div className="px-10 pt-10">
              <div className="rounded-xl border border-slate-800 bg-[#020617] px-6 py-8 text-[13px] text-slate-200">
                <div className="mb-1 text-sm font-semibold text-slate-50">
                  You don&apos;t have access to this Org Center
                </div>
                <p className="text-[11px] text-slate-500">
                  Ask an owner or admin to grant you access, or switch organizations.
                </p>
              </div>
            </div>
          </div>
        );
      }
    }

    // Fetch workspace to check onboarding status
    // Note: orgCenterOnboardingCompletedAt may not exist in schema yet
    let shouldShowOnboarding = false;
    if (context && prisma) {
      try {
        const workspace = await prisma.workspace.findUnique({
          where: { id: context.orgId },
          select: { id: true },
        });
        // For now, skip onboarding check if field doesn't exist
        // shouldShowOnboarding = !workspace?.orgCenterOnboardingCompletedAt && context.role === "OWNER";
      } catch (error) {
        console.error("[OrgLayout] Failed to check onboarding status:", error);
        // Don't block rendering if onboarding check fails
      }
    }

    return (
      <OrgPermissionsProvider value={clientPermissions}>
        {isOrgCenterBeta() && <OrgAnnouncementBanner />}
        <OrgLayoutClient beta={isOrgCenterBeta()}>
          {children}
        </OrgLayoutClient>
        <OrgWelcomeOverlay shouldShow={shouldShowOnboarding} />
      </OrgPermissionsProvider>
    );
  } catch (error) {
    // Catch any unexpected errors and show a graceful error UI
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("[OrgLayout] Error rendering layout:", error);
    console.error("[OrgLayout] Error details:", {
      message: errorMessage,
      stack: errorStack,
    });
    
    return (
      <div className="flex min-h-screen flex-col bg-[#020617]">
        <div className="px-10 pt-10">
          <div className="rounded-xl border border-red-900/60 bg-[#020617] px-6 py-8 text-[13px] text-slate-200">
            <div className="mb-1 text-sm font-semibold text-red-300">
              Unable to load Org Center
            </div>
            <p className="text-[11px] text-slate-500">
              There was an error loading the organization. Please try refreshing the page or contact support if the issue persists.
            </p>
            {process.env.NODE_ENV === "development" && (
              <div className="mt-3 space-y-2">
                <pre className="text-[10px] text-red-400 overflow-auto bg-red-950/30 p-2 rounded">
                  {errorMessage}
                </pre>
                {errorStack && (
                  <details className="text-[10px] text-red-300">
                    <summary className="cursor-pointer">Stack trace</summary>
                    <pre className="mt-1 overflow-auto bg-red-950/30 p-2 rounded">
                      {errorStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
