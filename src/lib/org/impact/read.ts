/**
 * Phase J: Impact Read Functions
 *
 * Database queries and label hydration for work impacts.
 */

import { prisma } from "@/lib/db";
import type { WorkImpact } from "@prisma/client";
import type { ImpactSubjectType, ResolvedImpact, InferredImpact } from "./types";
import {
  computeImpactKey,
  getSubjectIdentity,
  buildExplicitConfidence,
} from "./types";

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get all explicit impacts for a work request.
 */
export async function getExplicitImpacts(
  workspaceId: string,
  workRequestId: string
): Promise<WorkImpact[]> {
  return prisma.workImpact.findMany({
    where: {
      workspaceId,
      workRequestId,
    },
    orderBy: [{ severity: "desc" }, { subjectType: "asc" }, { impactKey: "asc" }],
  });
}

/**
 * Check if a reverse impact edge exists (for cycle detection).
 * Used to prevent 2-node cycles: A→B and B→A with same impactType.
 */
export async function hasReverseImpact(
  workspaceId: string,
  sourceWorkRequestId: string,
  targetWorkRequestId: string,
  impactType: string
): Promise<boolean> {
  const count = await prisma.workImpact.count({
    where: {
      workspaceId,
      workRequestId: targetWorkRequestId,
      subjectType: "WORK_REQUEST",
      subjectId: sourceWorkRequestId,
      impactType: impactType as WorkImpact["impactType"],
    },
  });
  return count > 0;
}

/**
 * Create an explicit impact.
 */
export async function createExplicitImpact(params: {
  workspaceId: string;
  workRequestId: string;
  subjectType: ImpactSubjectType;
  subjectId?: string | null;
  roleType?: string | null;
  domainKey?: string | null;
  impactType: WorkImpact["impactType"];
  severity: WorkImpact["severity"];
  explanation: string;
  createdById: string;
}): Promise<WorkImpact> {
  const subjectIdentity = getSubjectIdentity({
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    roleType: params.roleType,
    domainKey: params.domainKey,
  });

  const impactKey = computeImpactKey(
    params.workRequestId,
    params.subjectType,
    subjectIdentity,
    params.impactType
  );

  return prisma.workImpact.create({
    data: {
      workspaceId: params.workspaceId,
      workRequestId: params.workRequestId,
      impactKey,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      roleType: params.roleType,
      domainKey: params.domainKey,
      impactType: params.impactType,
      severity: params.severity,
      explanation: params.explanation,
      createdById: params.createdById,
    },
  });
}

/**
 * Delete an explicit impact.
 */
export async function deleteExplicitImpact(
  workspaceId: string,
  impactId: string
): Promise<WorkImpact | null> {
  return prisma.workImpact.delete({
    where: {
      id: impactId,
      workspaceId, // Ensure workspace scoping
    },
  });
}

// ============================================================================
// Label Hydration
// ============================================================================

type LabelCache = {
  teams: Map<string, string>;
  departments: Map<string, string>;
  people: Map<string, string>;
  workRequests: Map<string, string>;
  decisionDomains: Map<string, string>;
};

/**
 * Build a label cache for all subject types in a batch of impacts.
 */
export async function buildLabelCache(
  workspaceId: string,
  impacts: Array<{
    subjectType: ImpactSubjectType;
    subjectId?: string | null;
    roleType?: string | null;
    domainKey?: string | null;
  }>
): Promise<LabelCache> {
  const cache: LabelCache = {
    teams: new Map(),
    departments: new Map(),
    people: new Map(),
    workRequests: new Map(),
    decisionDomains: new Map(),
  };

  // Collect IDs by type
  const teamIds = new Set<string>();
  const deptIds = new Set<string>();
  const personIds = new Set<string>();
  const workRequestIds = new Set<string>();
  const domainKeys = new Set<string>();

  for (const impact of impacts) {
    switch (impact.subjectType) {
      case "TEAM":
        if (impact.subjectId) teamIds.add(impact.subjectId);
        break;
      case "DEPARTMENT":
        if (impact.subjectId) deptIds.add(impact.subjectId);
        break;
      case "PERSON":
        if (impact.subjectId) personIds.add(impact.subjectId);
        break;
      case "WORK_REQUEST":
        if (impact.subjectId) workRequestIds.add(impact.subjectId);
        break;
      case "DECISION_DOMAIN":
        if (impact.domainKey) domainKeys.add(impact.domainKey);
        break;
      // ROLE uses roleType directly as label, no lookup needed
    }
  }

  // Batch fetch all entities
  const [teams, departments, people, workRequests, decisionDomains] =
    await Promise.all([
      teamIds.size > 0
        ? prisma.orgTeam.findMany({
            where: { workspaceId, id: { in: Array.from(teamIds) } },
            select: { id: true, name: true },
          })
        : [],
      deptIds.size > 0
        ? prisma.orgDepartment.findMany({
            where: { workspaceId, id: { in: Array.from(deptIds) } },
            select: { id: true, name: true },
          })
        : [],
      personIds.size > 0
        ? prisma.user.findMany({
            where: { id: { in: Array.from(personIds) } },
            select: { id: true, name: true, email: true },
          })
        : [],
      workRequestIds.size > 0
        ? prisma.workRequest.findMany({
            where: { workspaceId, id: { in: Array.from(workRequestIds) } },
            select: { id: true, title: true },
          })
        : [],
      domainKeys.size > 0
        ? prisma.decisionDomain.findMany({
            where: { workspaceId, key: { in: Array.from(domainKeys) } },
            select: { key: true, name: true },
          })
        : [],
    ]);

  // Populate cache
  for (const team of teams) {
    cache.teams.set(team.id, team.name);
  }
  for (const dept of departments) {
    cache.departments.set(dept.id, dept.name);
  }
  for (const person of people) {
    cache.people.set(person.id, person.name ?? person.email ?? person.id);
  }
  for (const wr of workRequests) {
    cache.workRequests.set(wr.id, wr.title);
  }
  for (const domain of decisionDomains) {
    cache.decisionDomains.set(domain.key, domain.name);
  }

  return cache;
}

/**
 * Get label for a subject from cache.
 */
export function getLabelFromCache(
  cache: LabelCache,
  subjectType: ImpactSubjectType,
  subjectId: string | null | undefined,
  roleType: string | null | undefined,
  domainKey: string | null | undefined
): string {
  switch (subjectType) {
    case "TEAM":
      return cache.teams.get(subjectId ?? "") ?? subjectId ?? "Unknown Team";
    case "DEPARTMENT":
      return (
        cache.departments.get(subjectId ?? "") ??
        subjectId ??
        "Unknown Department"
      );
    case "PERSON":
      return cache.people.get(subjectId ?? "") ?? subjectId ?? "Unknown Person";
    case "WORK_REQUEST":
      return (
        cache.workRequests.get(subjectId ?? "") ??
        subjectId ??
        "Unknown Work Request"
      );
    case "DECISION_DOMAIN":
      return (
        cache.decisionDomains.get(domainKey ?? "") ??
        domainKey ??
        "Unknown Domain"
      );
    case "ROLE":
      return roleType ?? "Unknown Role";
    default:
      return "Unknown";
  }
}

/**
 * Hydrate labels for explicit impacts from DB records.
 */
export async function hydrateExplicitImpacts(
  workspaceId: string,
  dbImpacts: WorkImpact[]
): Promise<ResolvedImpact[]> {
  if (dbImpacts.length === 0) return [];

  const cache = await buildLabelCache(workspaceId, dbImpacts);

  return dbImpacts.map((impact) => ({
    impactKey: impact.impactKey,
    subjectType: impact.subjectType,
    subjectId: impact.subjectId,
    subjectLabel: getLabelFromCache(
      cache,
      impact.subjectType,
      impact.subjectId,
      impact.roleType,
      impact.domainKey
    ),
    impactType: impact.impactType,
    severity: impact.severity,
    explanation: impact.explanation,
    source: "EXPLICIT" as const,
    confidence: buildExplicitConfidence(),
    explicitImpactId: impact.id,
  }));
}

/**
 * Hydrate labels for inferred impacts.
 */
export async function hydrateInferredImpacts(
  workspaceId: string,
  workRequestId: string,
  inferredImpacts: InferredImpact[]
): Promise<ResolvedImpact[]> {
  if (inferredImpacts.length === 0) return [];

  const cache = await buildLabelCache(workspaceId, inferredImpacts);

  return inferredImpacts.map((impact) => {
    const subjectIdentity = getSubjectIdentity(impact);
    const impactKey = computeImpactKey(
      workRequestId,
      impact.subjectType,
      subjectIdentity,
      impact.impactType
    );

    return {
      impactKey,
      subjectType: impact.subjectType,
      subjectId: impact.subjectId,
      subjectLabel: getLabelFromCache(
        cache,
        impact.subjectType,
        impact.subjectId,
        impact.roleType,
        impact.domainKey
      ),
      impactType: impact.impactType,
      severity: impact.severity,
      explanation: impact.explanation,
      source: "INFERRED" as const,
      confidence: {
        score: 0.7,
        factors: { explicitness: 0.7, completeness: 1.0, consistency: 1.0 },
        explanation: [
          `Inferred from rule: ${impact.ruleId} (${impact.ruleDescription})`,
        ],
      },
      inferenceRule: impact.ruleId,
    };
  });
}

/**
 * Hydrate subject labels for a batch of impacts (explicit + inferred).
 * Generic function for external use.
 */
export async function hydrateSubjectLabels(
  workspaceId: string,
  impacts: Array<{
    subjectType: ImpactSubjectType;
    subjectId?: string | null;
    roleType?: string | null;
    domainKey?: string | null;
  }>
): Promise<LabelCache> {
  return buildLabelCache(workspaceId, impacts);
}
