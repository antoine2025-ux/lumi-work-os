/**
 * Derive role alignment for a project
 * 
 * Checks if a role's responsibilities align with the project's accountability type.
 */

export type RoleAlignmentResult = {
  status: "aligned" | "misaligned" | "unknown";
  reason?: string;
};

export function deriveRoleAlignment(args: {
  roleProfile: {
    ownershipScopes: string[];
    decisionScopes: string[];
  };
  projectName: string;
  accountabilityType: "owner" | "decision";
}): RoleAlignmentResult {
  const { roleProfile, projectName, accountabilityType } = args;

  // Extract keywords from project name (simple heuristic)
  const projectKeywords = projectName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  if (accountabilityType === "owner") {
    if (roleProfile.ownershipScopes.length === 0) {
      return {
        status: "unknown",
        reason: "Role has no ownership scopes defined",
      };
    }

    // Check if any ownership scope matches project keywords
    const hasMatch = roleProfile.ownershipScopes.some((scope) =>
      projectKeywords.some((kw) => scope.toLowerCase().includes(kw))
    );

    if (hasMatch) {
      return { status: "aligned" };
    }

    // If scopes exist but don't match, it's potentially misaligned
    return {
      status: "misaligned",
      reason: "Ownership scopes do not explicitly match project domain",
    };
  } else {
    // decision
    if (roleProfile.decisionScopes.length === 0) {
      return {
        status: "unknown",
        reason: "Role has no decision scopes defined",
      };
    }

    const hasMatch = roleProfile.decisionScopes.some((scope) =>
      projectKeywords.some((kw) => scope.toLowerCase().includes(kw))
    );

    if (hasMatch) {
      return { status: "aligned" };
    }

    return {
      status: "misaligned",
      reason: "Decision scopes do not explicitly match project domain",
    };
  }
}

