// src/lib/org/roleHealthService.ts

import type { ContextObject } from "@/lib/context";
import type { OrgHealthRoles } from "./healthTypes";

/**
 * Compute role health signals from Role ContextObjects.
 * Identifies roles with missing owner, responsibilities, team, or department.
 */
export function computeRoleHealth(
  roles: ContextObject[]
): OrgHealthRoles {
  const rolesWithoutOwner: { id: string; title: string }[] = [];
  const rolesWithoutResponsibilities: { id: string; title: string }[] = [];
  const rolesWithoutTeam: { id: string; title: string }[] = [];
  const rolesWithoutDepartment: { id: string; title: string }[] = [];

  for (const role of roles) {
    if (role.type !== "role") continue;

    const title = role.title ?? "(untitled role)";
    const base = { id: role.id, title };

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

    if (!hasOwner) {
      rolesWithoutOwner.push(base);
    }

    if (!hasResponsibilitiesTag) {
      rolesWithoutResponsibilities.push(base);
    }

    if (!hasTeamRelation) {
      rolesWithoutTeam.push(base);
    }

    if (!hasDepartmentRelation) {
      rolesWithoutDepartment.push(base);
    }
  }

  return {
    summary: {
      rolesWithoutOwner: rolesWithoutOwner.length,
      rolesWithoutResponsibilities: rolesWithoutResponsibilities.length,
      rolesWithoutTeam: rolesWithoutTeam.length,
      rolesWithoutDepartment: rolesWithoutDepartment.length,
    },
    details: {
      rolesWithoutOwner,
      rolesWithoutResponsibilities,
      rolesWithoutTeam,
      rolesWithoutDepartment,
    },
  };
}

