/**
 * Org QA Questions
 * 
 * Static list of Org QA questions with their types and current status.
 * This should be kept in sync with the smoke-test log and UI.
 */

import type { OrgQaQuestion } from "./org-qa-types";
import { inferOrgQuestionTypeFromRequest } from "./org-question-types";

/**
 * Map smoke test IDs to Org QA questions with inferred types.
 * Status should be updated based on latest QA runs.
 */
export const ORG_QA_QUESTIONS: OrgQaQuestion[] = [
  // Person questions
  {
    id: "org-reporting-1",
    label: "Who leads the Platform team?",
    type: "org.person",
    status: "pass",
    notes: "Fixed in L4 Steps 4-5",
  },
  {
    id: "org-reporting-2",
    label: "Who reports to the Head of Engineering?",
    type: "org.person",
    status: "pass", // Fixed in L4 Step 9 (bundling) + Step 10 (prompt)
    notes: "Fixed via reverse lookup and bundling improvements",
  },
  
  // Team questions
  {
    id: "org-team-membership-1",
    label: "Which people are in the AI & Loopbrain Team?",
    type: "org.team",
    status: "pass",
    notes: "Fixed in L4 Step 4 (team membership relations)",
  },
  
  // Department questions
  {
    id: "org-structure-1",
    label: "Which teams are part of the Engineering department?",
    type: "org.department",
    status: "pass",
    notes: "Fixed in L4 Step 5 (department relations)",
  },
  {
    id: "org-roles-1",
    label: "What roles exist in the Engineering department?",
    type: "org.department",
    status: "pass", // Fixed in L4 Step 9 (bundling) + Step 10 (prompt)
    notes: "Fixed via position ContextItems bundling and prompt improvements",
  },
  
  // Org-wide questions
  {
    id: "org-health-1",
    label: "Are there any single-person teams?",
    type: "org.org",
    status: "pass", // Fixed in L4 Step 9 (bundling) + Step 10 (prompt)
    notes: "Fixed via health analysis expansion and prompt improvements",
  },
  {
    id: "org-health-2",
    label: "Which manager has the most direct reports?",
    type: "org.org",
    status: "pass", // Fixed in L4 Step 9 (bundling) + Step 10 (prompt)
    notes: "Fixed via health analysis expansion and prompt improvements",
  },
];

/**
 * Helper to infer question type from smoke test question text.
 * Used for auto-classification when adding new questions.
 */
export function inferQuestionTypeFromSmokeTest(
  question: string
): OrgQaQuestion["type"] {
  const mockReq = { query: question };
  const inferred = inferOrgQuestionTypeFromRequest(mockReq);
  const inferredType = inferred?.type ?? "org.org";
  // Map "org.health" to "org.org" since health questions are org-wide
  return inferredType === "org.health" ? "org.org" : inferredType;
}

