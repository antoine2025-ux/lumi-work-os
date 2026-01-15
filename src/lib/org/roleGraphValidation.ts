// src/lib/org/roleGraphValidation.ts

import type { OrgLoopbrainContextObject } from "@/lib/loopbrain/org/types";

export type RoleGraphIssueType =
  | "NO_RESPONSIBILITIES"
  | "NO_OWNER"
  | "NO_TEAM"
  | "NO_DEPARTMENT";

export type RoleGraphIssue = {
  roleId: string;
  roleTitle: string;
  type: RoleGraphIssueType;
  message: string;
};

export type RoleGraphValidationResult = {
  rolesAnalyzed: number;
  issues: RoleGraphIssue[];
};

/**
 * Validate role graph for common issues.
 * Checks for missing responsibilities, owners, teams, and departments.
 */
export function validateRoleGraph(
  roles: OrgLoopbrainContextObject[]
): RoleGraphValidationResult {
  const issues: RoleGraphIssue[] = [];

  for (const role of roles) {
    if (role.type !== "role") continue;

    const tags = new Set(role.tags ?? []);
    const relations = role.relations ?? [];

    const hasResponsibilitiesTag = Array.from(tags).some((t) =>
      t.startsWith("responsibilities:")
    );

    const hasOwner =
      role.owner !== null &&
      typeof role.owner === "string" &&
      role.owner.startsWith("person:");

    const hasTeamRelation = relations.some(
      (rel) =>
        rel.type === "member_of_team" &&
        rel.targetId &&
        rel.targetId.startsWith("team:")
    );

    const hasDepartmentRelation = relations.some(
      (rel) =>
        rel.type === "member_of_department" &&
        rel.targetId &&
        rel.targetId.startsWith("department:")
    );

    if (!hasResponsibilitiesTag) {
      issues.push({
        roleId: role.id,
        roleTitle: role.title,
        type: "NO_RESPONSIBILITIES",
        message:
          "Role has no responsibilities tag; responsibilities may be missing or not mapped.",
      });
    }

    if (!hasOwner) {
      issues.push({
        roleId: role.id,
        roleTitle: role.title,
        type: "NO_OWNER",
        message: "Role has no owner (person) assigned.",
      });
    }

    if (!hasTeamRelation) {
      issues.push({
        roleId: role.id,
        roleTitle: role.title,
        type: "NO_TEAM",
        message: "Role is not linked to any team.",
      });
    }

    if (!hasDepartmentRelation) {
      issues.push({
        roleId: role.id,
        roleTitle: role.title,
        type: "NO_DEPARTMENT",
        message: "Role is not linked to any department.",
      });
    }
  }

  return {
    rolesAnalyzed: roles.filter((r) => r.type === "role").length,
    issues,
  };
}

