/**
 * Entity Graph Builder
 *
 * Builds EntityGraphSnapshotV0 from Prisma data for Loopbrain consumption.
 * Provides graph-based reasoning about organizational structure, expertise,
 * capacity, and dependency chains.
 *
 * @see src/lib/loopbrain/contract/entityLinks.v0.ts for contract definition
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type {
  EntityGraphSnapshotV0,
  EntityNodeV0,
  EntityLinkV0,
  EntityGraphMapsV0,
  EntityGraphSummaryV0,
  EntityTypeV0,
  LinkTypeV0,
  SkillProficiencyV0,
  PersonCapacitySummaryV0,
} from "./contract/entityLinks.v0";

// =============================================================================
// Types
// =============================================================================

interface BuildOptions {
  /** Include inactive entities (archived positions, etc.) */
  includeInactive?: boolean;
  /** Limit number of entities per type (for performance) */
  limit?: number;
}

// =============================================================================
// Main Builder Function
// =============================================================================

/**
 * Build a complete entity graph snapshot for a workspace.
 *
 * Loads all organizational entities (people, teams, departments, projects, skills, etc.)
 * and their relationships, then computes pre-computed maps for common queries.
 *
 * @param workspaceId - The workspace to build the graph for
 * @param options - Optional build configuration
 * @returns Complete EntityGraphSnapshotV0
 */
export async function buildEntityGraphSnapshot(
  workspaceId: string,
  options: BuildOptions = {}
): Promise<EntityGraphSnapshotV0> {
  const startTime = Date.now();
  const { includeInactive = false, limit = 10000 } = options;

  try {
    // Load all entities in parallel
    const [
      people,
      teams,
      departments,
      projects,
      skills,
      positions,
      personSkills,
      workAllocations,
      capacityContracts,
      decisionDomains,
      workRequests,
    ] = await Promise.all([
      loadPeople(workspaceId, limit),
      loadTeams(workspaceId, includeInactive, limit),
      loadDepartments(workspaceId, includeInactive, limit),
      loadProjects(workspaceId, includeInactive, limit),
      loadSkills(workspaceId, limit),
      loadPositions(workspaceId, includeInactive, limit),
      loadPersonSkills(workspaceId, limit),
      loadWorkAllocations(workspaceId, limit),
      loadCapacityContracts(workspaceId, limit),
      loadDecisionDomains(workspaceId, limit),
      loadWorkRequests(workspaceId, limit),
    ]);

    // Build nodes
    const nodes: EntityNodeV0[] = [];

    // Add person nodes
    for (const person of people) {
      nodes.push({
        id: `person_${person.id}`,
        entityType: "PERSON",
        label: person.name || person.email,
        metadata: {
          email: person.email,
          title: person.position?.title || null,
          teamId: person.position?.teamId || null,
        },
      });
    }

    // Add team nodes
    for (const team of teams) {
      nodes.push({
        id: `team_${team.id}`,
        entityType: "TEAM",
        label: team.name,
        metadata: {
          departmentId: team.departmentId,
          memberCount: team._count?.positions || 0,
          isActive: team.isActive,
        },
      });
    }

    // Add department nodes
    for (const dept of departments) {
      nodes.push({
        id: `department_${dept.id}`,
        entityType: "DEPARTMENT",
        label: dept.name,
        metadata: {
          teamCount: dept._count?.teams || 0,
          isActive: dept.isActive,
        },
      });
    }

    // Add project nodes
    for (const project of projects) {
      nodes.push({
        id: `project_${project.id}`,
        entityType: "PROJECT",
        label: project.name,
        metadata: {
          status: project.status,
          priority: project.priority,
          ownerId: project.ownerId,
          isArchived: project.isArchived,
        },
      });
    }

    // Add skill nodes
    for (const skill of skills) {
      nodes.push({
        id: `skill_${skill.id}`,
        entityType: "SKILL",
        label: skill.name,
        metadata: {
          category: skill.category,
          isActive: skill.isActive,
        },
      });
    }

    // Add role nodes (from positions)
    const roleMap = new Map<string, { title: string; count: number }>();
    for (const pos of positions) {
      if (!pos.title) continue;
      const existing = roleMap.get(pos.title);
      if (existing) {
        existing.count++;
      } else {
        roleMap.set(pos.title, { title: pos.title, count: 1 });
      }
    }
    for (const [roleTitle, data] of roleMap) {
      nodes.push({
        id: `role_${roleTitle.toLowerCase().replace(/\s+/g, "_")}`,
        entityType: "ROLE",
        label: roleTitle,
        metadata: {
          positionCount: data.count,
        },
      });
    }

    // Add decision domain nodes
    for (const domain of decisionDomains) {
      nodes.push({
        id: `decision_domain_${domain.id}`,
        entityType: "DECISION_DOMAIN",
        label: domain.name,
        metadata: {
          scope: domain.scope,
          isActive: domain.isActive,
        },
      });
    }

    // Add work request nodes
    for (const request of workRequests) {
      nodes.push({
        id: `work_request_${request.id}`,
        entityType: "WORK_REQUEST",
        label: request.title,
        metadata: {
          status: request.status,
          priority: request.priority,
          requesterId: request.requesterId,
        },
      });
    }

    // Sort nodes by ID for deterministic output
    nodes.sort((a, b) => a.id.localeCompare(b.id));

    // Build links
    const links: EntityLinkV0[] = [];
    let linkCounter = 0;

    // MEMBER_OF links (person → team via position)
    for (const pos of positions) {
      if (!pos.userId || !pos.teamId) continue;
      links.push({
        id: `link_${++linkCounter}`,
        sourceId: `person_${pos.userId}`,
        targetId: `team_${pos.teamId}`,
        linkType: "MEMBER_OF",
        strength: 1.0,
        metadata: { positionId: pos.id, title: pos.title },
      });
    }

    // REPORTS_TO links (person → person via position.parentId)
    for (const pos of positions) {
      if (!pos.userId || !pos.parentId) continue;
      const parentPos = positions.find((p) => p.id === pos.parentId);
      if (!parentPos?.userId) continue;
      links.push({
        id: `link_${++linkCounter}`,
        sourceId: `person_${pos.userId}`,
        targetId: `person_${parentPos.userId}`,
        linkType: "REPORTS_TO",
        strength: 1.0,
        metadata: { positionId: pos.id },
      });
    }

    // OWNS links (team → department)
    for (const team of teams) {
      if (!team.departmentId) continue;
      links.push({
        id: `link_${++linkCounter}`,
        sourceId: `team_${team.id}`,
        targetId: `department_${team.departmentId}`,
        linkType: "MEMBER_OF",
        strength: 1.0,
      });
    }

    // OWNS links (person → project via ownerId)
    for (const project of projects) {
      if (!project.ownerId) continue;
      links.push({
        id: `link_${++linkCounter}`,
        sourceId: `person_${project.ownerId}`,
        targetId: `project_${project.id}`,
        linkType: "OWNS",
        strength: 1.0,
      });
    }

    // HAS_SKILL links (person → skill)
    for (const ps of personSkills) {
      links.push({
        id: `link_${++linkCounter}`,
        sourceId: `person_${ps.personId}`,
        targetId: `skill_${ps.skillId}`,
        linkType: "HAS_SKILL",
        strength: ps.proficiency / 5, // Normalize to 0-1
        metadata: { proficiency: ps.proficiency },
      });
    }

    // ALLOCATED_TO links (person → project/team via WorkAllocation)
    for (const alloc of workAllocations) {
      if (!alloc.contextId) continue;
      const targetId =
        alloc.contextType === "PROJECT"
          ? `project_${alloc.contextId}`
          : alloc.contextType === "TEAM"
            ? `team_${alloc.contextId}`
            : null;
      if (!targetId) continue;
      links.push({
        id: `link_${++linkCounter}`,
        sourceId: `person_${alloc.personId}`,
        targetId,
        linkType: "ALLOCATED_TO",
        strength: alloc.allocationPercent,
        metadata: {
          startDate: alloc.startDate.toISOString(),
          endDate: alloc.endDate?.toISOString() || null,
        },
      });
    }

    // LEADS links (person → team via ownerPersonId)
    for (const team of teams) {
      if (!team.ownerPersonId) continue;
      links.push({
        id: `link_${++linkCounter}`,
        sourceId: `person_${team.ownerPersonId}`,
        targetId: `team_${team.id}`,
        linkType: "LEADS",
        strength: 1.0,
      });
    }

    // DECIDES_FOR links (person → decision domain)
    for (const domain of decisionDomains) {
      if (!domain.ownerId) continue;
      links.push({
        id: `link_${++linkCounter}`,
        sourceId: `person_${domain.ownerId}`,
        targetId: `decision_domain_${domain.id}`,
        linkType: "DECIDES_FOR",
        strength: 1.0,
      });
    }

    // Sort links by ID for deterministic output
    links.sort((a, b) => a.id.localeCompare(b.id));

    // Build pre-computed maps
    const maps = buildMaps(
      people,
      personSkills,
      capacityContracts,
      workAllocations,
      links
    );

    // Build summary
    const summary = buildSummary(nodes, links);

    const snapshot: EntityGraphSnapshotV0 = {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      nodes,
      links,
      maps,
      summary,
    };

    const duration = Date.now() - startTime;
    logger.info("[EntityGraph] Built snapshot", {
      workspaceId,
      nodeCount: nodes.length,
      linkCount: links.length,
      durationMs: duration,
    });

    return snapshot;
  } catch (error) {
    logger.error("[EntityGraph] Failed to build snapshot", {
      workspaceId,
      error,
    });
    throw error;
  }
}

// =============================================================================
// Map Builders
// =============================================================================

/**
 * Build expertise map from person skills.
 */
export async function buildExpertiseMap(
  workspaceId: string
): Promise<Record<string, SkillProficiencyV0[]>> {
  const personSkills = await loadPersonSkills(workspaceId, 10000);
  const expertise: Record<string, SkillProficiencyV0[]> = {};

  for (const ps of personSkills) {
    const personKey = `person_${ps.personId}`;
    if (!expertise[personKey]) {
      expertise[personKey] = [];
    }
    expertise[personKey].push({
      skillId: `skill_${ps.skillId}`,
      proficiency: ps.proficiency,
    });
  }

  // Sort skills by proficiency (highest first)
  for (const key of Object.keys(expertise)) {
    expertise[key].sort((a, b) => b.proficiency - a.proficiency);
  }

  return expertise;
}

/**
 * Build capacity map from capacity contracts and work allocations.
 */
export async function buildCapacityMap(
  workspaceId: string
): Promise<Record<string, PersonCapacitySummaryV0>> {
  const [contracts, allocations] = await Promise.all([
    loadCapacityContracts(workspaceId, 10000),
    loadWorkAllocations(workspaceId, 10000),
  ]);

  const capacity: Record<string, PersonCapacitySummaryV0> = {};
  const now = new Date();

  // Build map of current contracts
  const contractByPerson = new Map<string, number>();
  for (const contract of contracts) {
    // Check if contract is currently active
    if (contract.effectiveFrom > now) continue;
    if (contract.effectiveTo && contract.effectiveTo < now) continue;

    // Use most recent contract for each person
    const existing = contractByPerson.get(contract.personId);
    if (!existing || contract.weeklyCapacityHours > existing) {
      contractByPerson.set(contract.personId, contract.weeklyCapacityHours);
    }
  }

  // Calculate allocations per person
  const allocationByPerson = new Map<string, number>();
  for (const alloc of allocations) {
    // Check if allocation is currently active
    if (alloc.startDate > now) continue;
    if (alloc.endDate && alloc.endDate < now) continue;

    const existing = allocationByPerson.get(alloc.personId) || 0;
    allocationByPerson.set(alloc.personId, existing + alloc.allocationPercent);
  }

  // Build capacity summaries
  for (const [personId, weeklyHours] of contractByPerson) {
    const allocatedPct = allocationByPerson.get(personId) || 0;
    const availablePct = Math.max(0, 1 - allocatedPct);

    capacity[`person_${personId}`] = {
      weeklyHours,
      allocatedPct,
      availablePct,
    };
  }

  return capacity;
}

/**
 * Build dependency chains from DEPENDS_ON links.
 * Returns transitive closure of dependencies.
 */
export async function buildDependencyChains(
  workspaceId: string
): Promise<Record<string, string[]>> {
  // Load tasks with dependencies
  const tasks = await prisma.task.findMany({
    where: { workspaceId },
    select: {
      id: true,
      dependsOn: true,
      blocks: true,
    },
  });

  const chains: Record<string, string[]> = {};

  // Build adjacency list
  const dependsOnMap = new Map<string, string[]>();
  for (const task of tasks) {
    if (task.dependsOn.length > 0) {
      dependsOnMap.set(task.id, task.dependsOn);
    }
  }

  // Compute transitive closure for each task
  for (const task of tasks) {
    const visited = new Set<string>();
    const queue = [...(task.dependsOn || [])];

    while (queue.length > 0) {
      const dep = queue.shift()!;
      if (visited.has(dep)) continue;
      visited.add(dep);

      const transitiveDeps = dependsOnMap.get(dep) || [];
      queue.push(...transitiveDeps);
    }

    if (visited.size > 0) {
      chains[`task_${task.id}`] = Array.from(visited).map((id) => `task_${id}`);
    }
  }

  return chains;
}

/**
 * Get entity graph filtered to entities related to a specific person.
 */
export async function getEntityGraphForPerson(
  workspaceId: string,
  personId: string
): Promise<EntityNodeV0[]> {
  const snapshot = await buildEntityGraphSnapshot(workspaceId);
  const personNodeId = `person_${personId}`;

  // Find all nodes connected to this person
  const connectedNodeIds = new Set<string>([personNodeId]);

  for (const link of snapshot.links) {
    if (link.sourceId === personNodeId) {
      connectedNodeIds.add(link.targetId);
    }
    if (link.targetId === personNodeId) {
      connectedNodeIds.add(link.sourceId);
    }
  }

  return snapshot.nodes.filter((node) => connectedNodeIds.has(node.id));
}

// =============================================================================
// Data Loaders
// =============================================================================

async function loadPeople(workspaceId: string, limit: number) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: limit,
  });

  // Get positions for these users
  const userIds = members.map((m) => m.userId);
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      userId: { in: userIds },
      isActive: true,
    },
    select: {
      userId: true,
      title: true,
      teamId: true,
    },
  });

  const positionByUser = new Map(positions.map((p) => [p.userId, p]));

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    position: positionByUser.get(m.userId) || null,
  }));
}

async function loadTeams(
  workspaceId: string,
  includeInactive: boolean,
  limit: number
) {
  return prisma.orgTeam.findMany({
    where: {
      workspaceId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: {
      id: true,
      name: true,
      departmentId: true,
      ownerPersonId: true,
      isActive: true,
      _count: {
        select: {
          positions: { where: { isActive: true, userId: { not: null } } },
        },
      },
    },
    take: limit,
  });
}

async function loadDepartments(
  workspaceId: string,
  includeInactive: boolean,
  limit: number
) {
  return prisma.orgDepartment.findMany({
    where: {
      workspaceId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: {
      id: true,
      name: true,
      ownerPersonId: true,
      isActive: true,
      _count: {
        select: {
          teams: { where: { isActive: true } },
        },
      },
    },
    take: limit,
  });
}

async function loadProjects(
  workspaceId: string,
  includeInactive: boolean,
  limit: number
) {
  return prisma.project.findMany({
    where: {
      workspaceId,
      ...(includeInactive ? {} : { isArchived: false }),
    },
    select: {
      id: true,
      name: true,
      status: true,
      priority: true,
      ownerId: true,
      isArchived: true,
    },
    take: limit,
  });
}

async function loadSkills(workspaceId: string, limit: number) {
  // Skill model doesn't have isActive field
  const skills = await prisma.skill.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      category: true,
    },
    take: limit,
  });
  // Add isActive: true as default since field doesn't exist
  return skills.map((s) => ({ ...s, isActive: true }));
}

async function loadPositions(
  workspaceId: string,
  includeInactive: boolean,
  limit: number
) {
  return prisma.orgPosition.findMany({
    where: {
      workspaceId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: {
      id: true,
      userId: true,
      title: true,
      teamId: true,
      parentId: true,
      level: true,
      isActive: true,
    },
    take: limit,
  });
}

async function loadPersonSkills(workspaceId: string, limit: number) {
  return prisma.personSkill.findMany({
    where: { workspaceId },
    select: {
      personId: true,
      skillId: true,
      proficiency: true,
    },
    take: limit,
  });
}

async function loadWorkAllocations(workspaceId: string, limit: number) {
  return prisma.workAllocation.findMany({
    where: { workspaceId },
    select: {
      personId: true,
      allocationPercent: true,
      contextType: true,
      contextId: true,
      startDate: true,
      endDate: true,
    },
    take: limit,
  });
}

async function loadCapacityContracts(workspaceId: string, limit: number) {
  return prisma.capacityContract.findMany({
    where: { workspaceId },
    select: {
      personId: true,
      weeklyCapacityHours: true,
      effectiveFrom: true,
      effectiveTo: true,
    },
    take: limit,
  });
}

async function loadDecisionDomains(workspaceId: string, limit: number) {
  // DecisionDomain doesn't have ownerId field - it uses DecisionAuthority relation
  const domains = await prisma.decisionDomain.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      scope: true,
      isArchived: true,
      authority: {
        select: {
          primaryPersonId: true,
        },
      },
    },
    take: limit,
  });
  // Map to expected format
  return domains.map((d) => ({
    id: d.id,
    name: d.name,
    scope: d.scope,
    ownerId: d.authority?.primaryPersonId ?? null,
    isActive: !d.isArchived,
  }));
}

async function loadWorkRequests(workspaceId: string, limit: number) {
  // WorkRequest uses requesterPersonId not requesterId
  const requests = await prisma.workRequest.findMany({
    where: { workspaceId },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      requesterPersonId: true,
    },
    take: limit,
  });
  // Map to expected format
  return requests.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    priority: r.priority,
    requesterId: r.requesterPersonId,
  }));
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildMaps(
  people: Array<{ id: string }>,
  personSkills: Array<{ personId: string; skillId: string; proficiency: number }>,
  capacityContracts: Array<{
    personId: string;
    weeklyCapacityHours: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  }>,
  workAllocations: Array<{
    personId: string;
    allocationPercent: number;
    startDate: Date;
    endDate: Date | null;
  }>,
  links: EntityLinkV0[]
): EntityGraphMapsV0 {
  const expertise: Record<string, SkillProficiencyV0[]> = {};
  const capacity: Record<string, PersonCapacitySummaryV0> = {};
  const dependencyChains: Record<string, string[]> = {};

  // Build expertise map
  for (const ps of personSkills) {
    const personKey = `person_${ps.personId}`;
    if (!expertise[personKey]) {
      expertise[personKey] = [];
    }
    expertise[personKey].push({
      skillId: `skill_${ps.skillId}`,
      proficiency: ps.proficiency,
    });
  }

  // Sort skills by proficiency
  for (const key of Object.keys(expertise)) {
    expertise[key].sort((a, b) => b.proficiency - a.proficiency);
  }

  // Build capacity map
  const now = new Date();
  const contractByPerson = new Map<string, number>();
  for (const contract of capacityContracts) {
    if (contract.effectiveFrom > now) continue;
    if (contract.effectiveTo && contract.effectiveTo < now) continue;
    contractByPerson.set(contract.personId, contract.weeklyCapacityHours);
  }

  const allocationByPerson = new Map<string, number>();
  for (const alloc of workAllocations) {
    if (alloc.startDate > now) continue;
    if (alloc.endDate && alloc.endDate < now) continue;
    const existing = allocationByPerson.get(alloc.personId) || 0;
    allocationByPerson.set(alloc.personId, existing + alloc.allocationPercent);
  }

  for (const [personId, weeklyHours] of contractByPerson) {
    const allocatedPct = allocationByPerson.get(personId) || 0;
    capacity[`person_${personId}`] = {
      weeklyHours,
      allocatedPct,
      availablePct: Math.max(0, 1 - allocatedPct),
    };
  }

  // Build dependency chains from DEPENDS_ON links
  const dependsOnLinks = links.filter((l) => l.linkType === "DEPENDS_ON");
  const adjacency = new Map<string, string[]>();
  for (const link of dependsOnLinks) {
    const deps = adjacency.get(link.sourceId) || [];
    deps.push(link.targetId);
    adjacency.set(link.sourceId, deps);
  }

  for (const [sourceId, directDeps] of adjacency) {
    const visited = new Set<string>();
    const queue = [...directDeps];
    while (queue.length > 0) {
      const dep = queue.shift()!;
      if (visited.has(dep)) continue;
      visited.add(dep);
      const transitive = adjacency.get(dep) || [];
      queue.push(...transitive);
    }
    if (visited.size > 0) {
      dependencyChains[sourceId] = Array.from(visited);
    }
  }

  return { expertise, capacity, dependencyChains };
}

function buildSummary(
  nodes: EntityNodeV0[],
  links: EntityLinkV0[]
): EntityGraphSummaryV0 {
  const linksByType: Partial<Record<LinkTypeV0, number>> = {};
  const nodesByType: Partial<Record<EntityTypeV0, number>> = {};

  for (const link of links) {
    linksByType[link.linkType] = (linksByType[link.linkType] || 0) + 1;
  }

  for (const node of nodes) {
    nodesByType[node.entityType] = (nodesByType[node.entityType] || 0) + 1;
  }

  return {
    nodeCount: nodes.length,
    linkCount: links.length,
    linksByType,
    nodesByType,
  };
}

// =============================================================================
// Cache Invalidation
// =============================================================================

// In-memory cache for graph snapshots (TTL: 5 minutes)
const graphCache = new Map<
  string,
  { snapshot: EntityGraphSnapshotV0; expiresAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Get cached entity graph or build new one.
 */
export async function getCachedEntityGraph(
  workspaceId: string,
  options: BuildOptions = {}
): Promise<EntityGraphSnapshotV0> {
  const cacheKey = `${workspaceId}:${JSON.stringify(options)}`;
  const cached = graphCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const snapshot = await buildEntityGraphSnapshot(workspaceId, options);
  graphCache.set(cacheKey, {
    snapshot,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return snapshot;
}

/**
 * Invalidate cached graph for a workspace.
 */
export function invalidateGraphCache(workspaceId: string): void {
  for (const key of graphCache.keys()) {
    if (key.startsWith(`${workspaceId}:`)) {
      graphCache.delete(key);
    }
  }
  logger.debug("[EntityGraph] Cache invalidated", { workspaceId });
}
