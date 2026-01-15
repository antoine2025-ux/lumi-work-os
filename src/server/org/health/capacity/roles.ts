export type CanonicalRole = "Engineering" | "Product" | "Design" | "QA" | "Data" | "Other"

export const DEFAULT_ROLE_REQUIREMENTS: Array<{
  role: CanonicalRole
  minPercent: number
}> = [
  // v0 defaults; tune per your product philosophy later
  { role: "Engineering", minPercent: 55 },
  { role: "Product", minPercent: 10 },
  { role: "Design", minPercent: 8 },
  { role: "QA", minPercent: 7 },
]

/**
 * Map arbitrary role labels to a canonical role bucket.
 * Expand this list over time based on real org role vocabulary.
 */
export function toCanonicalRole(roleLabel: string): CanonicalRole {
  const r = String(roleLabel).toLowerCase()

  if (r.includes("engineer") || r.includes("developer") || r.includes("software") || r === "eng") return "Engineering"
  if (r.includes("product") || r.includes("pm") || r.includes("owner")) return "Product"
  if (r.includes("design") || r.includes("ux") || r.includes("ui")) return "Design"
  if (r.includes("qa") || r.includes("quality") || r.includes("tester") || r.includes("test")) return "QA"
  if (r.includes("data") || r.includes("analyst") || r.includes("analytics") || r.includes("ml")) return "Data"

  return "Other"
}

