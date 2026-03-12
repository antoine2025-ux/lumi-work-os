// src/lib/context/org/loadRoleContexts.ts

import { prisma } from "@/lib/db";
import {
  buildRoleContext,
  type RoleContextInput,
} from "./buildRoleContext";
import type { RoleContextObject } from "./roleContextTypes";

/**
 * Load role/position-level context for all active OrgPositions in a workspace.
 *
 * For each OrgPosition:
 *  - Join RoleCard (if any)
 *  - Join OrgTeam + OrgDepartment
 *  - Join User holder(s) (primary holder via OrgPosition.userId)
 *  - Build RoleContextObject via buildRoleContext(...)
 */
export async function loadRoleContexts(
  workspaceId: string
): Promise<RoleContextObject[]> {
  if (!workspaceId) {
    throw new Error("loadRoleContexts: workspaceId is required");
  }

  // 1) Fetch all active OrgPositions for this workspace
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      title: true,
      level: true,
      roleDescription: true,
      responsibilities: true,
      requiredSkills: true,
      preferredSkills: true,
      keyMetrics: true,
      teamSize: true,
      budget: true,
      reportingStructure: true,
      teamId: true,
      parentId: true,
      children: {
        select: {
          id: true,
        },
      },
      roleCard: {
        select: {
          id: true,
          roleName: true,
          jobFamily: true,
          level: true,
          roleDescription: true,
          keyMetrics: true,
          responsibilities: true,
          requiredSkills: true,
          preferredSkills: true,
          // Manager-authored person-specific context
          roleInOrg: true,
          focusArea: true,
          managerNotes: true,
        },
      },
      jobDescription: {
        select: { id: true, title: true, summary: true, level: true },
      },
      team: {
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      },
    },
  });

  if (positions.length === 0) {
    return [];
  }

  const teamIds = Array.from(
    new Set(
      positions
        .map((p) => p.teamId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const departmentIds = Array.from(
    new Set(
      positions
        .map((p) => p.team?.departmentId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const userIds = Array.from(
    new Set(
      positions
        .map((p) => p.userId)
        .filter((id): id is string => Boolean(id))
    )
  );

  // 2) Load teams referenced by positions
  const teams = teamIds.length
    ? await prisma.orgTeam.findMany({
        where: {
          workspaceId,
          id: {
            in: teamIds,
          },
        },
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      })
    : [];

  const teamById = new Map<string, (typeof teams)[number]>();
  for (const t of teams) {
    teamById.set(t.id, t);
  }

  // 3) Load departments
  const departments = departmentIds.length
    ? await prisma.orgDepartment.findMany({
        where: {
          workspaceId,
          id: {
            in: departmentIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];

  const departmentById = new Map<string, (typeof departments)[number]>();
  for (const d of departments) {
    departmentById.set(d.id, d);
  }

  // 4) Load primary holders (Users) for roles that have userId
  const users = userIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];

  const userById = new Map<string, (typeof users)[number]>();
  for (const u of users) {
    userById.set(u.id, u);
  }

  // 5) Build a map of role (OrgPosition) -> holders
  //
  // For now:
  //  - We treat OrgPosition.userId as the primary holder (one-to-one).
  //  - activeHolderIds = [userId] when present.
  //
  // Later, we can extend this to support multi-holder roles by:
  //  - Introducing a dedicated linking table between user + OrgPosition
  //  - Or inferring via team structure / project ownership.
  const activeHolderIdsByRoleId = new Map<string, string[]>();
  const primaryHolderIdByRoleId = new Map<string, string>();

  for (const pos of positions) {
    if (!pos.userId) continue;

    activeHolderIdsByRoleId.set(pos.id, [pos.userId]);
    primaryHolderIdByRoleId.set(pos.id, pos.userId);
  }

  // 6) Map positions by id for parent/child references
  const positionById = new Map<string, (typeof positions)[number]>();
  for (const pos of positions) {
    positionById.set(pos.id, pos);
  }

  // 7) Build RoleContextObjects
  const results: RoleContextObject[] = [];

  for (const pos of positions) {
    const team = pos.team ?? (pos.teamId ? teamById.get(pos.teamId) ?? null : null);

    const departmentId = team?.departmentId ?? null;

    const department =
      departmentId ? departmentById.get(departmentId) ?? null : null;

    const primaryHolderId = primaryHolderIdByRoleId.get(pos.id) ?? null;
    const primaryHolder =
      primaryHolderId ? userById.get(primaryHolderId) ?? null : null;

    const activeHolderIds = activeHolderIdsByRoleId.get(pos.id) ?? [];

    const childRoleIds = pos.children.map((child) => child.id);

    // Expected vs actual team size
    const expectedTeamSize = pos.teamSize ?? null;
    const actualTeamSize =
      activeHolderIds.length > 0 ? activeHolderIds.length : null;

    // Responsibilities + metrics, merging OrgPosition + RoleCard
    const roleCard = pos.roleCard;

    const responsibilities = [
      ...(pos.responsibilities ?? []),
      ...(roleCard?.responsibilities ?? []),
    ];

    const keyMetrics = [
      ...(pos.keyMetrics ?? []),
      ...(roleCard?.keyMetrics ?? []),
    ];

    const requiredSkills = [
      ...(pos.requiredSkills ?? []),
      ...(roleCard?.requiredSkills ?? []),
    ];

    const preferredSkills = [
      ...(pos.preferredSkills ?? []),
      ...(roleCard?.preferredSkills ?? []),
    ];

    const responsibilitiesSummary =
      pos.roleDescription ??
      roleCard?.roleDescription ??
      null;

    // Risk hints (very lightweight; full org health engine will refine)
    let riskLevelHint: RoleContextInput["riskLevelHint"] = "unknown";
    const riskReasonsHint: string[] = [];

    if (activeHolderIds.length === 0) {
      riskLevelHint = "medium";
      riskReasonsHint.push("Role currently has no holder (vacant).");
    } else if (activeHolderIds.length === 1 && (expectedTeamSize ?? 0) > 1) {
      riskLevelHint = "medium";
      riskReasonsHint.push(
        "Single-point holder for a role with non-trivial expected team size."
      );
    }

    if (
      expectedTeamSize &&
      actualTeamSize &&
      actualTeamSize > expectedTeamSize * 1.5
    ) {
      riskLevelHint = "high";
      riskReasonsHint.push(
        "Actual holder count significantly exceeds expected team size."
      );
    }

    const input: RoleContextInput = {
      workspaceId: pos.workspaceId,
      roleId: pos.id,
      title: pos.title,
      level: pos.level ?? null,
      description: pos.roleDescription ?? null,
      isActive: true,
      roleCardId: roleCard?.id ?? null,
      jobFamily: roleCard?.jobFamily ?? null,
      roleCardDescription: roleCard?.roleDescription ?? null,
      teamId: team?.id ?? pos.teamId ?? null,
      teamName: team?.name ?? null,
      departmentId,
      departmentName: department?.name ?? null,
      parentRoleId: pos.parentId ?? null,
      childRoleIds,
      expectedTeamSize,
      actualTeamSize,
      primaryHolderId,
      primaryHolderName: primaryHolder?.name ?? null,
      activeHolderIds,
      responsibilitiesSummary,
      responsibilities,
      decisionRights: [], // Future: we can add explicit decision rights from RoleCard
      keyMetrics,
      requiredSkills,
      preferredSkills,
      riskLevelHint,
      riskReasonsHint,
      tags: [],
    };

    const contextObject = buildRoleContext(input);

    // Enrich meta with manager-authored context and JobDescription data
    const jd = pos.jobDescription;
    const metaExtras: Record<string, unknown> = {};
    if (jd) {
      metaExtras.jobDescriptionTitle = jd.title;
      if (jd.summary) metaExtras.jobDescriptionSummary = jd.summary;
      if (jd.level) metaExtras.jobDescriptionLevel = jd.level;
    }
    if (roleCard?.roleInOrg) metaExtras.roleInOrg = roleCard.roleInOrg;
    if (roleCard?.focusArea) metaExtras.focusArea = roleCard.focusArea;
    if (roleCard?.managerNotes) metaExtras.managerNotes = roleCard.managerNotes;
    if (Object.keys(metaExtras).length > 0) {
      contextObject.data.meta = { ...contextObject.data.meta, ...metaExtras };
    }

    results.push(contextObject);
  }

  return results;
}

