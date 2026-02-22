/**
 * Read services for Org Ownership.
 *
 * Phase S: This function is now a thin adapter around resolveOwnershipSignals.
 * The canonical ownership logic is in the resolver; this function maps to DTO format.
 *
 * IMPORTANT: These services assume Prisma is already workspace-scoped
 * via setWorkspaceContext(workspaceId) in the calling route handler.
 *
 * See docs/org/intelligence-rules.md for canonical rules.
 *
 * ⸻
 *
 * Ownership Read Path — Accountability Only
 *
 * RULES:
 * 1. Ownership is about WHO, not WHERE.
 *
 * 2. Ownership queries must explicitly exclude:
 *    - Teams with departmentId: null (unassigned teams)
 *    - Structural grouping problems
 *    - People hierarchy problems
 *
 * 3. Coverage counts reflect only entities that can meaningfully be owned.
 *
 * 4. If a team has no department but has an owner:
 *    - It is not unowned
 *    - It does not appear in Ownership
 *    - It appears only as an unassigned team in Org Chart / Structure
 *
 * @deprecated Direct UI calls should use /api/org/ownership route.
 *             This function remains for backward compatibility.
 */

import { prisma } from "@/lib/db";
import type { OrgOwnershipDTO } from "@/server/org/dto";
import { loadIntelligenceData } from "@/lib/org/intelligence/queries";
import { resolveOwnershipSignals } from "@/lib/org/intelligence/resolvers/ownership";

/**
 * Get ownership coverage and assignments.
 * Returns coverage stats, unowned entities, and all assignments.
 *
 * Phase S: Uses canonical resolver for ownership logic.
 * Additional details (departmentName, owner names) are fetched separately.
 *
 * @param workspaceId - Workspace ID (required for resolvers)
 * @deprecated Direct UI calls should use /api/org/ownership route.
 */
export async function getOrgOwnership(workspaceId: string): Promise<OrgOwnershipDTO> {
  // Phase S: Load data and resolve ownership signals
  const data = await loadIntelligenceData(workspaceId);
  const signals = resolveOwnershipSignals(data);

  // Build entity lookup maps for additional details
  const deptMap = new Map(data.departments.map((d) => [d.id, d]));

  // Get department names for teams (signals don't include this)
  const departmentNameMap = new Map<string, string>();
  for (const team of data.teams) {
    if (team.departmentId) {
      const dept = deptMap.get(team.departmentId);
      if (dept) {
        departmentNameMap.set(team.id, dept.name);
      }
    }
  }

  // Get all assignments for owner details (signals don't include owner names)
  const assignments = await prisma.ownerAssignment.findMany({
    where: {
      workspaceId,
      entityType: { in: ["TEAM", "DEPARTMENT"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get owner user details
  const ownerPersonIds = [...new Set(assignments.map((a) => a.ownerPersonId))];
  const owners = await prisma.user.findMany({
    where: { id: { in: ownerPersonIds } },
    select: { id: true, name: true, email: true },
  });

  const ownerMap = new Map(owners.map((u) => [u.id, u]));

  // Map unowned entities from signals to DTO format
  const unowned: OrgOwnershipDTO["unowned"] = signals.unownedEntities.map((entity) => {
    if (entity.type === "team") {
      return {
        entityType: "TEAM" as const,
        entityId: entity.id,
        name: entity.name ?? "Unknown",
        departmentName: departmentNameMap.get(entity.id) ?? null,
        suggestedOwnerPersonId: null,
      };
    } else {
      return {
        entityType: "DEPARTMENT" as const,
        entityId: entity.id,
        name: entity.name ?? "Unknown",
        suggestedOwnerPersonId: null,
      };
    }
  });

  return {
    coverage: {
      teams: {
        total: signals.coverage.teams.total,
        owned: signals.coverage.teams.owned,
        unowned: signals.coverage.teams.unowned,
      },
      departments: {
        total: signals.coverage.departments.total,
        owned: signals.coverage.departments.owned,
        unowned: signals.coverage.departments.unowned,
      },
    },
    unowned,
    assignments: assignments
      .filter((a) => ownerMap.has(a.ownerPersonId))
      .map((a) => {
        const owner = ownerMap.get(a.ownerPersonId)!;
        return {
          id: a.id,
          entityType: a.entityType as "TEAM" | "DEPARTMENT",
          entityId: a.entityId,
          owner: {
            id: owner.id,
            fullName: owner.name || owner.email || "Unknown",
          },
        };
      }),
  };
}

