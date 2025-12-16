// src/lib/org/context/buildRoleContext.ts

import type { RoleContext } from "./roleContextTypes";
import type { RoleCard, OrgPosition, OrgTeam, OrgDepartment } from "@prisma/client";
import { buildRoleId } from "./roleId";

/**
 * Input structure to build role context from RoleCard + OrgPosition.
 * We'll enrich this in later steps.
 */
export type RoleContextSource = {
  workspaceId: string;
  roleCard?: RoleCard | null;
  position?: OrgPosition | null;
  team?: OrgTeam | null;
  department?: OrgDepartment | null;
  parentPosition?: OrgPosition | null;
};

/**
 * Build a unified RoleContext from RoleCard and/or OrgPosition sources.
 * This merges data from both sources into a canonical representation.
 */
export function buildRoleContext(
  source: RoleContextSource
): RoleContext | null {
  const { workspaceId, roleCard, position, team, department, parentPosition } = source;

  if (!roleCard && !position) {
    // Nothing to build from – safe guard
    return null;
  }

  const now = new Date();

  // Canonical Role ID format:
  // - Position-backed: role:{workspaceId}:position:{orgPositionId}
  // - RoleCard-only: role:{workspaceId}:role-card:{roleCardId}
  // - Fallback: role:{workspaceId}:fallback:{seed}
  const id = (() => {
    if (position?.id) {
      return buildRoleId({
        kind: "position",
        workspaceId,
        positionId: position.id,
      });
    }

    if (roleCard?.id) {
      return buildRoleId({
        kind: "roleCard",
        workspaceId,
        roleCardId: roleCard.id,
      });
    }

    return buildRoleId({
      kind: "fallback",
      workspaceId,
      seed: "no-source",
    });
  })();

  const title =
    roleCard?.roleName ??
    position?.title ??
    "Untitled Role";

  // Handle type mismatch: RoleCard.level is String, OrgPosition.level is Int
  const level =
    roleCard?.level ??
    (position?.level !== null && position?.level !== undefined
      ? String(position.level)
      : null) ??
    null;

  const jobFamily = roleCard?.jobFamily ?? null;

  const roleDescription =
    roleCard?.roleDescription ??
    position?.roleDescription ??
    null;

  const responsibilities = [
    ...(roleCard?.responsibilities ?? []),
    ...(position?.responsibilities ?? []),
  ];

  const requiredSkills = [
    ...(roleCard?.requiredSkills ?? []),
    ...(position?.requiredSkills ?? []),
  ];

  const preferredSkills = [
    ...(roleCard?.preferredSkills ?? []),
    ...(position?.preferredSkills ?? []),
  ];

  const keyMetrics = [
    ...(roleCard?.keyMetrics ?? []),
    ...(position?.keyMetrics ?? []),
  ];

  const teamId = position?.teamId ?? team?.id ?? null;
  const departmentId = team?.departmentId ?? department?.id ?? null;

  const sourceType: "roleCard" | "orgPosition" =
    position ? "orgPosition" : "roleCard";

  const reportsToRoleId = parentPosition?.id ?? null;

  const userId = position?.userId ?? null;

  return {
    id,
    sourceType,
    workspaceId,
    title,
    level,
    jobFamily,
    roleDescription,
    responsibilities,
    requiredSkills,
    preferredSkills,
    keyMetrics,
    teamId,
    departmentId,
    reportsToRoleId,
    userId,
    createdAt: roleCard?.createdAt ?? position?.createdAt ?? now,
    updatedAt: roleCard?.updatedAt ?? position?.updatedAt ?? now,
  };
}

