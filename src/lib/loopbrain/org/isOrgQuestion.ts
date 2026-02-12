// src/lib/loopbrain/org/isOrgQuestion.ts

export type OrgQuestionMeta = {
  // Optional hint from the UI / caller, e.g. "org" | "generic"
  requestedMode?: string | null;
};

const ORG_KEYWORDS = [
  "org",
  "organisation",
  "organization",
  "org chart",
  "org structure",
  "team",
  "teams",
  "department",
  "departments",
  "manager",
  "managers",
  "reports to",
  "who reports",
  "reporting line",
  "reporting structure",
  "span of control",
  "headcount",
  "line manager",
  "direct reports",
  "workload hotspots",
  "ceo",
  "cto",
  "cfo",
  "coo",
  "vp ",
  "vice president",
  "people in the",
  "who do we have",
  "who works",
  "role",
  "roles",
  "position",
  "positions",
  "hierarchy",
];

/**
 * Determine if a question is Org-related based on keywords and explicit mode hints.
 * 
 * @param question - The user's question
 * @param meta - Optional metadata including requestedMode hint
 * @returns true if the question should be handled in Org mode
 */
export function isOrgQuestion(
  question: string,
  meta?: OrgQuestionMeta
): boolean {
  const q = (question || "").toLowerCase().trim();

  if (!q) return false;

  // 1) Explicit override from caller (if the UI knows this is Org mode)
  if (meta?.requestedMode === "org") return true;
  if (meta?.requestedMode === "generic") return false;

  // 2) Quick keyword heuristic
  return ORG_KEYWORDS.some((kw) => q.includes(kw));
}

