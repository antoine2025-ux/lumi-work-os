/**
 * Org Question Types
 * 
 * Defines canonical Org question types that determine:
 * - Bundle expansion strategy
 * - Prompt reasoning hints
 * - Focus entity identification
 */

export type OrgQuestionType =
  | "org.person"
  | "org.team"
  | "org.department"
  | "org.role"
  | "org.org"
  | "org.health";

export type OrgQuestionContext = {
  type: OrgQuestionType;
  // Optional focus IDs (only one will typically be set)
  personId?: string; // "person:<id>"
  teamId?: string; // "team:<id>"
  departmentId?: string; // "department:<id>"
  roleId?: string; // "role:<workspaceId>:position:<id>" or "role:<workspaceId>:role-card:<id>"
  orgId?: string; // usually "org"
};

/**
 * Infer Org question type from LoopbrainRequest.
 * Uses teamId, roleId, personId, or query keywords to determine question type.
 */
export function inferOrgQuestionTypeFromRequest(
  req: { teamId?: string; roleId?: string; personId?: string; query: string; workspaceId?: string }
): OrgQuestionContext | null {
  const { teamId, roleId, personId, query, workspaceId } = req;
  const queryLower = query.toLowerCase();

  // Explicit person context (check personId first, then roleId if it looks like person:)
  if (personId) {
    return {
      type: "org.person",
      personId: personId.startsWith("person:") ? personId : `person:${personId}`,
    };
  }

  // Explicit team context
  if (teamId) {
    return {
      type: "org.team",
      teamId: teamId.startsWith("team:") ? teamId : `team:${teamId}`,
    };
  }

  // Explicit role context
  if (roleId) {
    // Check if roleId is already in canonical format (role:...)
    if (roleId.startsWith("role:")) {
      return {
        type: "org.role",
        roleId: roleId,
      };
    }
    // If it's a person ID format, treat as person
    if (roleId.startsWith("person:")) {
      return {
        type: "org.person",
        personId: roleId,
      };
    }
    // If we have workspaceId, try to build canonical role ID
    // Assume it's a position ID if not in canonical format
    if (workspaceId) {
      const canonicalRoleId = `role:${workspaceId}:position:${roleId}`;
      return {
        type: "org.role",
        roleId: canonicalRoleId,
      };
    }
    // Otherwise, pass through as-is (backend will handle it)
    return {
      type: "org.role",
      roleId: roleId,
    };
  }

  // Infer from query keywords
  // Person/reporting questions
  if (
    queryLower.includes("reports to") ||
    queryLower.includes("who manages") ||
    queryLower.includes("direct reports") ||
    queryLower.includes("manager") ||
    queryLower.includes("who leads")
  ) {
    return {
      type: "org.person",
    };
  }

  // Team questions
  if (
    queryLower.includes("team") ||
    queryLower.includes("who is in") ||
    queryLower.includes("members of") ||
    queryLower.includes("which people are in")
  ) {
    return {
      type: "org.team",
    };
  }

  // Department questions
  if (
    queryLower.includes("department") ||
    queryLower.includes("which teams are part of") ||
    queryLower.includes("roles exist in") ||
    queryLower.includes("teams are in")
  ) {
    return {
      type: "org.department",
    };
  }

  // Org health questions (check before general org questions)
  if (
    queryLower.includes("explain") && (
      queryLower.includes("health") ||
      queryLower.includes("score") ||
      queryLower.includes("risks")
    )
  ) {
    return {
      type: "org.health",
      orgId: "org",
    };
  }

  // Org-wide/health questions
  if (
    queryLower.includes("single-person team") ||
    queryLower.includes("manager has the most") ||
    queryLower.includes("span of control") ||
    queryLower.includes("how many") ||
    queryLower.includes("organization") ||
    queryLower.includes("org structure") ||
    queryLower.includes("org health") ||
    queryLower.includes("risks") ||
    queryLower.includes("gaps")
  ) {
    return {
      type: "org.org",
      orgId: "org",
    };
  }

  // Default: org-wide
  return {
    type: "org.org",
    orgId: "org",
  };
}

/**
 * Infer Org question type from primary ContextObject.
 * Used as fallback when request doesn't provide explicit type.
 */
export function inferOrgQuestionTypeFromPrimary(
  primary: { type: string; id: string } | null
): OrgQuestionType {
  if (!primary) return "org.org";
  if (primary.type === "person") return "org.person";
  if (primary.type === "team") return "org.team";
  if (primary.type === "department") return "org.department";
  if (primary.type === "role") return "org.role";
  return "org.org";
}

