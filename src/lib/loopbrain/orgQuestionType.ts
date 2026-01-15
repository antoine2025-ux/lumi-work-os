/**
 * Org Question Type Detection
 * 
 * Simple heuristic-based classifier for routing org questions
 * to appropriate sub-context helpers.
 */

/**
 * Detect org question type from query text.
 * Simple heuristic-based classifier for routing to appropriate sub-context.
 */
export function detectOrgQuestionType(
  query: string
): "headcount" | "reporting" | "risk" | "generic" {
  const q = query.toLowerCase();

  if (
    q.includes("headcount") ||
    q.includes("how many people") ||
    q.includes("how many employees") ||
    q.includes("how many teammates") ||
    q.includes("staff count") ||
    q.includes("team size") ||
    q.includes("department size") ||
    q.includes("how many are in")
  ) {
    return "headcount";
  }

  if (
    q.includes("report to") ||
    q.includes("manager of") ||
    q.includes("who manages") ||
    q.includes("line manager") ||
    q.includes("org chart") ||
    q.includes("reporting line") ||
    q.includes("reports to") ||
    q.includes("direct reports") ||
    (q.includes("who does") && q.includes("report"))
  ) {
    return "reporting";
  }

  if (
    q.includes("risk") ||
    q.includes("single point") ||
    q.includes("single-point") ||
    q.includes("overloaded manager") ||
    q.includes("span of control") ||
    q.includes("org health") ||
    q.includes("bottleneck") ||
    q.includes("gaps") ||
    q.includes("issues") ||
    q.includes("problems") ||
    q.includes("concerns")
  ) {
    return "risk";
  }

  return "generic";
}

