/**
 * Recommendations Overview
 *
 * Client component that fetches and displays Phase R recommendations.
 * Designed for graceful degradation - if fetch fails, shows error state
 * without blocking the rest of the Overview page.
 */

"use client";

import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { RecommendationsPanel } from "./RecommendationsPanel";

/**
 * Default limit for overview display.
 * Shows top 6 recommendations for a quick glance.
 */
const OVERVIEW_RECOMMENDATION_LIMIT = 6;

export function RecommendationsOverview() {
  const { data, error, loading } = useOrgQuery(
    () => OrgApi.getReasoning({ limit: OVERVIEW_RECOMMENDATION_LIMIT }),
    []
  );

  // Extract recommendations from response
  const recommendations = data?.data?.recommendations ?? null;

  // Convert any error to Error object
  const errorObj = error ? new Error(String(error)) : null;

  return (
    <RecommendationsPanel
      recommendations={recommendations}
      isLoading={loading}
      error={errorObj}
      showViewAll={true}
    />
  );
}

export default RecommendationsOverview;
