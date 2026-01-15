/**
 * Loopbrain Org Context Builder.
 * 
 * Constructs a consolidated, structured context payload for Loopbrain ingestion.
 * Derived from canonical org data sources (People, Structure, Ownership, Intelligence).
 */

import { prisma } from "@/lib/db";
import type { LoopbrainOrgContext } from "./types";
import { validateLoopbrainOrgContextV1 } from "./validate";
import { buildRecommendations } from "@/server/org/intelligence/recommendations/build";
import { getOrCreateIntelligenceSettings } from "@/server/org/intelligence/settings";
import { isAvailabilityStale } from "@/server/org/availability/stale";
import { computeSnapshotFreshness } from "@/server/org/intelligence/freshness";

/**
 * Build the complete Loopbrain Org context payload.
 * 
 * This aggregates:
 * - Org readiness state (deterministic checklist)
 * - Org counts (people, teams, departments, gaps)
 * - Latest intelligence snapshot + rollups + top findings
 * - Recommendations derived from snapshot findings
 */
export async function buildLoopbrainOrgContext(): Promise<LoopbrainOrgContext> {
  // Fetch core org data in parallel
  // Note: Using OrgPosition model for people data (current org structure)
  const [positions, teams, departments, ownershipAssignments, availabilityHealth] = await Promise.all([
    prisma.orgPosition.findMany({
      where: { isActive: true, userId: { not: null } },
      select: {
        id: true,
        userId: true,
        parentId: true, // manager relationship
        teamId: true,
      },
    }),
    prisma.orgTeam.findMany({
      where: { isActive: true },
      select: { id: true, ownerPersonId: true },
    }),
    prisma.orgDepartment.findMany({
      where: { isActive: true },
      select: { id: true },
    }),
    prisma.ownerAssignment.findMany({
      where: { entityType: { in: ["TEAM", "DEPARTMENT"] } },
      select: { entityType: true, entityId: true },
    }),
    prisma.personAvailabilityHealth.findMany({
      select: { personId: true, status: true, updatedAt: true },
    }),
  ]);

  const peopleCount = positions.length;
  const teamCount = teams.length;
  const deptCount = departments.length;

  // Build ownership index for efficient lookup
  const ownershipIndex = new Set<string>();
  for (const a of ownershipAssignments) {
    ownershipIndex.add(`${a.entityType}:${a.entityId}`);
  }

  // Build availability map
  const availabilityMap = new Map<string, { status: string; updatedAt: Date }>();
  for (const av of availabilityHealth) {
    availabilityMap.set(av.personId, {
      status: av.status,
      updatedAt: av.updatedAt,
    });
  }

  // Count missing managers (for reporting completeness)
  const missingManagers = peopleCount <= 1 ? 0 : positions.filter((p) => !p.parentId).length;

  // Availability computation (reuse canonical logic)
  const settings = await getOrCreateIntelligenceSettings();
  const userIds = positions.map((p) => p.userId!).filter(Boolean);
  const availabilityUnknown = userIds.filter((userId) => !availabilityMap.has(userId)).length;
  const availabilityStale = Array.from(availabilityMap.values()).filter((av) =>
    isAvailabilityStale(av.updatedAt, settings.availabilityStaleDays)
  ).length;

  // Count unowned entities (teams + departments)
  // Teams can have ownerPersonId directly OR via OrgOwnershipAssignment
  const unownedTeams = teams.filter(
    (t) => !ownershipIndex.has(`TEAM:${t.id}`) && !t.ownerPersonId
  ).length;
  // Departments only via OrgOwnershipAssignment (no direct ownerPersonId field)
  const unownedDepts = departments.filter((d) => !ownershipIndex.has(`DEPARTMENT:${d.id}`)).length;
  const unownedEntities = unownedTeams + unownedDepts;

  // Deterministic readiness computation (server-side mirror of frontend logic)
  const people_added = peopleCount > 0;
  const structure_defined = teamCount > 0 || deptCount > 0;
  const ownership_assigned = teamCount + deptCount === 0 ? false : unownedEntities === 0;
  const reporting_defined = peopleCount <= 1 ? true : missingManagers === 0;
  const availability_set =
    peopleCount === 0 ? false : availabilityUnknown === 0 && availabilityStale === 0;

  const readinessItems = [
    { key: "people_added", complete: people_added, meta: { peopleCount } },
    { key: "structure_defined", complete: structure_defined, meta: { teamCount, deptCount } },
    { key: "ownership_assigned", complete: ownership_assigned, meta: { unownedEntities } },
    { key: "reporting_defined", complete: reporting_defined, meta: { missingManagers } },
    {
      key: "availability_set",
      complete: availability_set,
      meta: { availabilityUnknown, availabilityStale },
    },
  ];

  const ready = readinessItems.every((i) => i.complete);

  // Fetch latest intelligence snapshot
  const latestSnap = await prisma.orgIntelligenceSnapshot.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      source: true,
      findingCount: true,
      findingsJson: true,
      rollupsJson: true,
    },
  });

  const findings = latestSnap && Array.isArray(latestSnap.findingsJson) ? latestSnap.findingsJson : [];
  const topFindings = (findings as any[]).slice(0, 25);

  // Build recommendations from snapshot findings
  const recs = buildRecommendations(findings as any);
  const topActions = recs.slice(0, 25);

  // Compute snapshot freshness
  const freshness = computeSnapshotFreshness({
    createdAt: latestSnap ? latestSnap.createdAt : null,
    freshMinutes: settings.snapshotFreshMinutes,
    warnMinutes: settings.snapshotWarnMinutes,
  });
  if (latestSnap) {
    freshness.snapshotId = latestSnap.id;
  }

  const context: LoopbrainOrgContext = {
    generatedAt: new Date().toISOString(),
    version: "v1",
    readiness: { ready, items: readinessItems },
    orgCounts: {
      people: peopleCount,
      teams: teamCount,
      departments: deptCount,
      unownedEntities,
      missingManagers,
      availabilityUnknown,
      availabilityStale,
    },
    intelligence: {
      snapshot: latestSnap
        ? {
            id: latestSnap.id,
            createdAt: latestSnap.createdAt.toISOString(),
            source: latestSnap.source,
            findingCount: latestSnap.findingCount,
          }
        : null,
      rollups: (latestSnap?.rollupsJson as any) ?? null,
      topFindings,
    },
    recommendations: {
      snapshot: latestSnap
        ? { id: latestSnap.id, createdAt: latestSnap.createdAt.toISOString() }
        : null,
      topActions,
    },
    freshness: {
      intelligenceSnapshot: freshness,
    },
  };

  // Validate payload structure and invariants before returning
  validateLoopbrainOrgContextV1(context);

  return context;
}

