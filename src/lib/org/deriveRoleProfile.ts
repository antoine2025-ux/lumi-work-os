export type RoleProfile = {
  roleName: string;
  ownershipScopes: string[];
  decisionScopes: string[];
  executionScopes: string[];
};

export function deriveRoleProfile(role: {
  name: string;
  responsibilities: { scope: string; target: string }[];
}): RoleProfile {
  return {
    roleName: role.name,
    ownershipScopes: role.responsibilities
      .filter((r) => r.scope === "OWNERSHIP")
      .map((r) => r.target),
    decisionScopes: role.responsibilities
      .filter((r) => r.scope === "DECISION")
      .map((r) => r.target),
    executionScopes: role.responsibilities
      .filter((r) => r.scope === "EXECUTION")
      .map((r) => r.target),
  };
}

