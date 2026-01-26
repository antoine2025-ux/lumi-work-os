/**
 * Org Ownership Page - Server Component
 * 
 * MVP Purpose: Show ownership coverage and unowned entities.
 * 
 * This page helps answer: "Who owns what?"
 * It shows:
 * - Ownership coverage (how many teams/domains have owners)
 * - List of unowned entities
 * - Actions to assign owners
 * 
 * This is a core MVP surface - ownership is essential for Loopbrain context.
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server"
import { OrgPageHeader } from "@/components/org/OrgPageHeader"
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker"
import { OwnershipClient } from "@/components/org/OwnershipClient"

export const dynamic = "force-dynamic"

export default async function OwnershipPage() {
  try {
    const context = await getOrgPermissionContext()
    if (!context) {
      return (
        <>
          <OrgPageHeader
            title="Ownership"
            description="Ensure every team and department has a clear accountable owner."
          />
          <div className="mx-auto w-full max-w-6xl px-10 pb-10">
            <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/60 px-6 py-6 text-[13px] text-yellow-100">
              <div className="font-semibold">No active organization</div>
              <div className="mt-2 text-yellow-200">
                Please select an organization to view ownership data.
              </div>
            </div>
          </div>
        </>
      )
    }

    return (
      <>
        <OrgPageViewTracker route="/org/ownership" name="Org Ownership" />
        <OrgPageHeader
          breadcrumb="ORG / OWNERSHIP"
          title="Ownership"
          description="Ensure every team and department has a clear accountable owner."
        />
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
          <OwnershipClient />
        </div>
      </>
    )
  } catch (error: any) {
    // Re-throw Next.js redirect errors - they should propagate
    if (error?.digest === 'NEXT_REDIRECT' || error?.message === 'NEXT_REDIRECT') {
      throw error;
    }
    
    console.error("[OwnershipPage] Error:", error)
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / OWNERSHIP"
          title="Ownership"
          description="Ensure every team and department has a clear accountable owner."
        />
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
          <div className="rounded-2xl border border-red-900/60 bg-red-950/60 px-6 py-6 text-[13px] text-red-100">
            <div className="font-semibold">Error loading ownership data</div>
            <div className="mt-2 text-red-200">
              {error?.message || "An unexpected error occurred. Please try refreshing the page."}
            </div>
          </div>
        </div>
      </>
    )
  }
}

