/**
 * Canonical "active people" directory query.
 *
 * Single source of truth for listing active workspace members.
 * Matches the Capacity v1 "active OrgPosition" definition:
 *   - OrgPosition.isActive === true
 *   - OrgPosition.userId is not null
 *
 * Usage constraint: This module is NOT wired into production People UI yet.
 * It is introduced for Capacity v1 and future refactors only.
 * Existing People UI continues to consume /api/org/people via listOrgPeople().
 */

import { prisma } from "@/lib/db";

export type WorkspacePeopleDirectoryRow = {
  /** userId from OrgPosition (the person's user ID) */
  personId: string;
  /** OrgPosition ID (most recent active position) */
  positionId: string;
  name: string;
  email: string | null;
  role: string | null;
  teamId: string | null;
  departmentId: string | null;
  /** Parent OrgPosition ID (manager's position) */
  managerPositionId: string | null;
};

/**
 * Return all active people in the workspace.
 *
 * Definition of "active":
 *   - OrgPosition.isActive === true
 *   - OrgPosition.userId is not null (position is filled)
 *   - WorkspaceMember.employmentStatus !== "TERMINATED"
 *
 * For each user we pick the most recent active position (by createdAt desc)
 * to resolve role/team/manager.
 */
export async function getWorkspacePeopleDirectory(
  workspaceId: string
): Promise<WorkspacePeopleDirectoryRow[]> {
  // Fetch all active, filled positions in the workspace
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      userId: { not: null },
    },
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      parentId: true,
      teamId: true,
      user: {
        select: { id: true, name: true, email: true },
      },
      team: {
        select: {
          id: true,
          departmentId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter out terminated members
  const userIds = positions
    .map((p) => p.userId)
    .filter((uid): uid is string => uid !== null);

  const terminatedMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      userId: { in: userIds },
      employmentStatus: "TERMINATED",
    },
    select: { userId: true },
  });

  const terminatedSet = new Set(terminatedMembers.map((m) => m.userId));

  // Deduplicate: pick the most recent active position per user
  // (positions are already ordered by createdAt desc)
  const seen = new Set<string>();
  const rows: WorkspacePeopleDirectoryRow[] = [];

  for (const pos of positions) {
    const uid = pos.userId;
    if (!uid || seen.has(uid) || terminatedSet.has(uid)) continue;
    seen.add(uid);

    rows.push({
      personId: uid,
      positionId: pos.id,
      name: pos.user?.name ?? "Unknown",
      email: pos.user?.email ?? null,
      role: pos.title ?? null,
      teamId: pos.teamId ?? null,
      departmentId: pos.team?.departmentId ?? null,
      managerPositionId: pos.parentId ?? null,
    });
  }

  return rows;
}
