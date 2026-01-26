/**
 * Org Recommendations Page
 * 
 * Displays all AI-driven recommendations for org health improvements.
 * Full-page view of all recommendations (unlimited, unlike the overview panel).
 */

import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { RecommendationsPageClient } from "@/components/org/recommendations/RecommendationsPageClient";

export const dynamic = "force-dynamic";

export default function OrgRecommendationsPage() {
  return (
    <>
      <OrgPageHeader
        title="Recommendations"
        description="AI-driven recommendations to improve your organization's health and structure."
      />
      <div className="px-10 pb-10">
        <RecommendationsPageClient />
      </div>
    </>
  );
}
