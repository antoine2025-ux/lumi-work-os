/**
 * Org Insights Page - Server Component (Lightweight Shell)
 * 
 * PERFORMANCE OPTIMIZATION:
 * - This page shell renders INSTANTLY without waiting for heavy insights queries
 * - Only handles:
 *   - Page header (via OrgPageHeader)
 *   - Basic layout scaffolding
 *   - Permission checks (lightweight, already cached in layout)
 * - Heavy insights data loading is handled asynchronously by OrgInsightsClient
 *   via the /api/org/insights/overview endpoint
 * 
 * The page feels instant because:
 * 1. Header and layout render immediately
 * 2. OrgInsightsClient shows skeletons while fetching
 * 3. Data loads in the background without blocking the shell
 */

import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import OrgInsightsClient from "./OrgInsightsClient";

export default async function OrgInsightsPage() {
  // Lightweight permission check - this is already cached per-request from layout
  // We only need it for gating the page access, not for data fetching
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <div className="px-10 pt-10">
        <div className="max-w-lg rounded-2xl border border-slate-800 bg-[#020617] px-6 py-6 text-[13px] text-slate-200">
          <div className="text-[15px] font-semibold text-slate-100">
            No organization selected
          </div>
          <p className="mt-2 text-[12px] text-slate-500">
            You need to create or select a workspace to view insights in the Org Center.
          </p>
        </div>
      </div>
    );
  }

  const canView = hasOrgCapability(context.role, "org:insights:view");

  if (!canView) {
    return (
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
    );
  }

  // Shell renders instantly - OrgInsightsClient handles async data loading
  return (
    <div className="px-10 pt-8 pb-10">
      <OrgPageViewTracker route="/org/insights" name="Org Insights" />
      <OrgPageHeader
        breadcrumb="ORG / INSIGHTS"
        title="Insights"
        description="See analytics, trends, and structural patterns for your organization."
      />
      <div className="mt-6">
        <OrgInsightsClient />
      </div>
    </div>
  );
}

