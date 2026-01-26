/**
 * Recommendations Page Client Component
 *
 * Full-page view of all recommendations (no limit).
 * Fetches all recommendations and displays them in a comprehensive list.
 */

"use client";

import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { RecommendationsPanel } from "./RecommendationsPanel";

export function RecommendationsPageClient() {
  // Fetch ALL recommendations (no limit)
  const { data, error, loading } = useOrgQuery(
    () => OrgApi.getReasoning(),
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
      showViewAll={false}
    />
  );
}

export default RecommendationsPageClient;
