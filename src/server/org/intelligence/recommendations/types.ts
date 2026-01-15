/**
 * Intelligence recommendation types.
 * 
 * Recommendations translate findings into concrete, actionable next steps.
 */

import type { OrgIntelligenceFinding } from "@/server/org/intelligence/types";

export type OrgRecommendationActionType =
  | "ASSIGN_OWNER"
  | "SET_MANAGER"
  | "SET_AVAILABILITY"
  | "ASSIGN_TEAM"
  | "REVIEW_MANAGEMENT_LOAD";

export type OrgRecommendation = {
  id: string; // stable deterministic id derived from finding
  actionType: OrgRecommendationActionType;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  entityType: "PERSON" | "TEAM" | "DEPARTMENT" | "ORG";
  entityId: string | null;
  fixHref: string;
  sourceFinding: OrgIntelligenceFinding;
};

