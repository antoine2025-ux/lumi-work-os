/**
 * Insight Detector
 *
 * Detects proactive insights from organizational data and stores them
 * in the database. Supports multiple insight types including capacity,
 * workload, deadline, dependency, and coverage insights.
 *
 * @see src/lib/loopbrain/contract/proactiveInsight.v0.ts
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import type {
  ProactiveInsightV0,
  InsightTriggerV0,
  InsightCategoryV0,
  InsightPriorityV0,
  InsightStatusV0,
  RecommendationV0,
  InsightEvidenceV0,
  AffectedEntityV0,
  InsightBatchV0,
  InsightBatchSummaryV0,
} from "./contract/proactiveInsight.v0";
import {
  INSIGHT_PRIORITY_ORDER_V0,
  INSIGHT_TTL_DEFAULTS_V0,
  calculateBatchFreshness,
  sortInsightsByUrgency,
} from "./contract/proactiveInsight.v0";

// =============================================================================
// Types
// =============================================================================

interface DetectionOptions {
  /** Only detect specific categories */
  categories?: InsightCategoryV0[];
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Maximum insights to generate */
  maxInsights?: number;
}

interface InsightInput {
  trigger: InsightTriggerV0;
  category: InsightCategoryV0;
  priority: InsightPriorityV0;
  title: string;
  description: string;
  confidence: number;
  recommendations: RecommendationV0[];
  evidence: InsightEvidenceV0[];
  affectedEntities: AffectedEntityV0[];
  expiresAt?: Date | null;
  metadata?: Record<string, string | number | boolean | null>;
}

// =============================================================================
// Main Detection Function
// =============================================================================

/**
 * Detect all insights for a workspace.
 * Runs all detection functions in parallel and aggregates results.
 *
 * Insight types detected:
 * 1. CAPACITY - Team utilization, over-allocation
 * 2. WORKLOAD - Blocked tasks, unassigned high-priority
 * 3. PROJECT - Deadline clusters, stalled projects
 * 4. DEPENDENCY - Blocked chains
 * 5. OWNERSHIP - Unowned teams, roles without backup
 * 6. SKILL_GAP - Missing skills, skill concentration risk
 * 7. COMMUNICATION - Decision domain gaps
 */
export async function detectInsights(
  workspaceId: string,
  options: DetectionOptions = {}
): Promise<ProactiveInsightV0[]> {
  const startTime = Date.now();
  const { categories, minConfidence = 0.5, maxInsights = 100 } = options;

  try {
    // Run all detectors in parallel
    const detectorResults = await Promise.all([
      categories?.includes("CAPACITY") !== false
        ? detectCapacityInsights(workspaceId)
        : [],
      categories?.includes("WORKLOAD") !== false
        ? detectWorkloadInsights(workspaceId)
        : [],
      categories?.includes("PROJECT") !== false
        ? detectProjectHealthInsights(workspaceId)
        : [],
      categories?.includes("DEPENDENCY") !== false
        ? detectDependencyInsights(workspaceId)
        : [],
      categories?.includes("OWNERSHIP") !== false
        ? detectCoverageInsights(workspaceId)
        : [],
      categories?.includes("SKILL_GAP") !== false
        ? detectSkillGapInsights(workspaceId)
        : [],
      categories?.includes("COMMUNICATION") !== false
        ? detectCommunicationInsights(workspaceId)
        : [],
    ]);

    // Flatten and filter results
    let insights = detectorResults.flat();

    // Filter by confidence
    insights = insights.filter((i) => i.confidence >= minConfidence);

    // Sort by urgency and limit
    insights = sortInsightsByUrgency(insights).slice(0, maxInsights);

    const duration = Date.now() - startTime;
    logger.info("[InsightDetector] Detection complete", {
      workspaceId,
      insightCount: insights.length,
      durationMs: duration,
    });

    return insights;
  } catch (error) {
    logger.error("[InsightDetector] Detection failed", {
      workspaceId,
      error,
    });
    throw error;
  }
}

// =============================================================================
// Capacity Insights
// =============================================================================

/**
 * Detect capacity-related insights.
 * - Team utilization > 90%
 * - Individual over-allocation
 * - Capacity contract conflicts
 */
export async function detectCapacityInsights(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();

  try {
    // Load capacity data
    const [teams, allocations, contracts] = await Promise.all([
      prisma.orgTeam.findMany({
        where: { workspaceId, isActive: true },
        include: {
          positions: {
            where: { isActive: true, userId: { not: null } },
            select: { userId: true },
          },
        },
      }),
      prisma.workAllocation.findMany({
        where: {
          workspaceId,
          OR: [{ endDate: null }, { endDate: { gte: now } }],
          startDate: { lte: now },
        },
      }),
      prisma.capacityContract.findMany({
        where: {
          workspaceId,
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          effectiveFrom: { lte: now },
        },
      }),
    ]);

    // Calculate team utilization
    for (const team of teams) {
      const memberIds = team.positions.map((p) => p.userId).filter(Boolean) as string[];
      if (memberIds.length === 0) continue;

      // Calculate total allocation for team members
      const teamAllocations = allocations.filter((a) =>
        memberIds.includes(a.personId)
      );
      const totalAllocation = teamAllocations.reduce(
        (sum, a) => sum + a.allocationPercent,
        0
      );
      const avgUtilization = totalAllocation / memberIds.length;

      // Check for high utilization
      if (avgUtilization > 0.9) {
        const priority: InsightPriorityV0 =
          avgUtilization > 0.95 ? "CRITICAL" : "HIGH";
        insights.push(
          createInsight({
            trigger: "THRESHOLD_BREACH",
            category: "CAPACITY",
            priority,
            title: `${team.name} team at ${Math.round(avgUtilization * 100)}% capacity`,
            description: `The ${team.name} team has ${memberIds.length} members with an average utilization of ${Math.round(avgUtilization * 100)}%. Consider redistributing work or adding capacity.`,
            confidence: 0.85,
            recommendations: [
              {
                id: randomUUID(),
                action: `Review workload distribution for ${team.name}`,
                actionType: "REVIEW",
                deepLink: `/org/teams/${team.id}`,
                confidence: 0.8,
              },
              {
                id: randomUUID(),
                action: "Consider reassigning tasks to other teams",
                actionType: "REASSIGN",
                confidence: 0.7,
              },
            ],
            evidence: [
              { path: "team.utilization", value: avgUtilization },
              { path: "team.memberCount", value: memberIds.length },
            ],
            affectedEntities: [
              {
                entityType: "TEAM",
                entityId: team.id,
                label: team.name,
                impact: "High utilization may cause delays",
              },
            ],
            expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.CAPACITY * 1000),
          })
        );
      }
    }

    // Check for over-allocated individuals
    const allocationByPerson = new Map<string, number>();
    for (const alloc of allocations) {
      const current = allocationByPerson.get(alloc.personId) || 0;
      allocationByPerson.set(alloc.personId, current + alloc.allocationPercent);
    }

    for (const [personId, totalAlloc] of allocationByPerson) {
      if (totalAlloc > 1.0) {
        insights.push(
          createInsight({
            trigger: "THRESHOLD_BREACH",
            category: "CAPACITY",
            priority: totalAlloc > 1.2 ? "HIGH" : "MEDIUM",
            title: `Person over-allocated at ${Math.round(totalAlloc * 100)}%`,
            description: `A team member is allocated at ${Math.round(totalAlloc * 100)}% of their capacity, which may lead to burnout or missed deadlines.`,
            confidence: 0.9,
            recommendations: [
              {
                id: randomUUID(),
                action: "Review and reduce allocations",
                actionType: "REASSIGN",
                deepLink: `/org/people/${personId}`,
                confidence: 0.85,
              },
            ],
            evidence: [
              { path: "person.allocation", value: totalAlloc },
            ],
            affectedEntities: [
              {
                entityType: "PERSON",
                entityId: personId,
                label: "Team member",
                impact: "Over-allocation risk",
              },
            ],
            expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.CAPACITY * 1000),
          })
        );
      }
    }

    return insights;
  } catch (error) {
    logger.error("[InsightDetector] Capacity detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// Workload Insights
// =============================================================================

/**
 * Detect workload-related insights.
 * - Blocked tasks > 20% of active
 * - Unassigned high-priority tasks
 */
export async function detectWorkloadInsights(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();

  try {
    // Load task data
    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        assigneeId: true,
        projectId: true,
        dueDate: true,
      },
    });

    // Calculate blocked task ratio per project
    const projectStats = new Map<
      string,
      { total: number; blocked: number; unassignedHigh: number }
    >();

    for (const task of tasks) {
      const stats = projectStats.get(task.projectId) || {
        total: 0,
        blocked: 0,
        unassignedHigh: 0,
      };
      stats.total++;

      if (task.status === "BLOCKED") {
        stats.blocked++;
      }

      // Priority enum only has LOW, MEDIUM, HIGH (no CRITICAL)
      if (!task.assigneeId && task.priority === "HIGH") {
        stats.unassignedHigh++;
      }

      projectStats.set(task.projectId, stats);
    }

    // Generate insights for projects with issues
    for (const [projectId, stats] of projectStats) {
      if (stats.total === 0) continue;

      const blockedRatio = stats.blocked / stats.total;

      // Blocked work accumulation
      if (blockedRatio > 0.2) {
        insights.push(
          createInsight({
            trigger: "THRESHOLD_BREACH",
            category: "WORKLOAD",
            priority: blockedRatio > 0.3 ? "HIGH" : "MEDIUM",
            title: `${Math.round(blockedRatio * 100)}% of tasks blocked`,
            description: `${stats.blocked} out of ${stats.total} tasks are blocked in this project. This may indicate dependency issues or resource constraints.`,
            confidence: 0.85,
            recommendations: [
              {
                id: randomUUID(),
                action: "Review blocked tasks and resolve blockers",
                actionType: "REVIEW",
                deepLink: `/projects/${projectId}?filter=blocked`,
                confidence: 0.8,
              },
            ],
            evidence: [
              { path: "project.blockedRatio", value: blockedRatio },
              { path: "project.blockedCount", value: stats.blocked },
              { path: "project.totalTasks", value: stats.total },
            ],
            affectedEntities: [
              {
                entityType: "PROJECT",
                entityId: projectId,
                label: "Project",
                impact: "Blocked work accumulation",
              },
            ],
            expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.WORKLOAD * 1000),
          })
        );
      }

      // Unassigned high-priority tasks
      if (stats.unassignedHigh > 0) {
        insights.push(
          createInsight({
            trigger: "COVERAGE_GAP",
            category: "WORKLOAD",
            priority: stats.unassignedHigh > 3 ? "HIGH" : "MEDIUM",
            title: `${stats.unassignedHigh} high-priority tasks unassigned`,
            description: `There are ${stats.unassignedHigh} high-priority tasks without an assignee. These should be assigned to ensure timely completion.`,
            confidence: 0.9,
            recommendations: [
              {
                id: randomUUID(),
                action: "Assign high-priority tasks",
                actionType: "REASSIGN",
                deepLink: `/projects/${projectId}?filter=unassigned`,
                confidence: 0.85,
              },
            ],
            evidence: [
              { path: "project.unassignedHighPriority", value: stats.unassignedHigh },
            ],
            affectedEntities: [
              {
                entityType: "PROJECT",
                entityId: projectId,
                label: "Project",
                impact: "Unassigned high-priority work",
              },
            ],
            expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.WORKLOAD * 1000),
          })
        );
      }
    }

    return insights;
  } catch (error) {
    logger.error("[InsightDetector] Workload detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// Dependency Insights
// =============================================================================

/**
 * Detect dependency-related insights.
 * - Blocked dependency chains
 * - Circular dependencies
 */
export async function detectDependencyInsights(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();

  try {
    // Load tasks with dependencies
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        OR: [
          { dependsOn: { isEmpty: false } },
          { blocks: { isEmpty: false } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        dependsOn: true,
        blocks: true,
        projectId: true,
      },
    });

    // Build dependency graph
    const taskById = new Map(tasks.map((t) => [t.id, t]));

    // Check for blocked dependency chains
    for (const task of tasks) {
      if (task.status === "BLOCKED" && task.blocks.length > 0) {
        // This blocked task is blocking other tasks
        const blockedDownstream = task.blocks.filter((id) => {
          const downstream = taskById.get(id);
          return downstream && downstream.status !== "DONE";
        });

        if (blockedDownstream.length >= 2) {
          insights.push(
            createInsight({
              trigger: "DEPENDENCY_RISK",
              category: "DEPENDENCY",
              priority: blockedDownstream.length >= 3 ? "HIGH" : "MEDIUM",
              title: `Blocked task blocking ${blockedDownstream.length} others`,
              description: `Task "${task.title}" is blocked and is preventing ${blockedDownstream.length} other tasks from proceeding. Resolving this blocker should be prioritized.`,
              confidence: 0.9,
              recommendations: [
                {
                  id: randomUUID(),
                  action: "Resolve blocker immediately",
                  actionType: "ESCALATE",
                  deepLink: `/tasks/${task.id}`,
                  confidence: 0.85,
                },
              ],
              evidence: [
                { path: "task.blockedDownstreamCount", value: blockedDownstream.length },
                { path: "task.status", value: task.status },
              ],
              affectedEntities: [
                {
                  entityType: "TASK",
                  entityId: task.id,
                  label: task.title,
                  impact: "Blocking other tasks",
                },
              ],
              expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.DEPENDENCY * 1000),
            })
          );
        }
      }
    }

    return insights;
  } catch (error) {
    logger.error("[InsightDetector] Dependency detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// Coverage Insights
// =============================================================================

/**
 * Detect coverage-related insights.
 * - Critical roles without backup
 * - Unowned teams/departments
 */
export async function detectCoverageInsights(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();

  try {
    // Load coverage data
    const [teams, departments, roleCoverages] = await Promise.all([
      prisma.orgTeam.findMany({
        where: { workspaceId, isActive: true },
        select: {
          id: true,
          name: true,
          ownerPersonId: true,
        },
      }),
      prisma.orgDepartment.findMany({
        where: { workspaceId, isActive: true },
        select: {
          id: true,
          name: true,
          ownerPersonId: true,
        },
      }),
      // RoleCoverage uses secondaryPersonIds array, not backupPersonId
      prisma.roleCoverage.findMany({
        where: { workspaceId },
        select: {
          id: true,
          roleType: true,
          primaryPersonId: true,
          secondaryPersonIds: true,
        },
      }),
    ]);

    // Check for unowned teams
    const unownedTeams = teams.filter((t) => !t.ownerPersonId);
    if (unownedTeams.length > 0) {
      insights.push(
        createInsight({
          trigger: "COVERAGE_GAP",
          category: "OWNERSHIP",
          priority: unownedTeams.length > 3 ? "HIGH" : "MEDIUM",
          title: `${unownedTeams.length} teams without owners`,
          description: `There are ${unownedTeams.length} teams without designated owners. This may lead to unclear accountability and decision-making delays.`,
          confidence: 0.9,
          recommendations: [
            {
              id: randomUUID(),
              action: "Assign owners to teams",
              actionType: "CONFIGURE",
              deepLink: "/org/teams",
              confidence: 0.85,
            },
          ],
          evidence: [
            { path: "teams.unownedCount", value: unownedTeams.length },
            { path: "teams.names", value: unownedTeams.map((t) => t.name) },
          ],
          affectedEntities: unownedTeams.slice(0, 5).map((t) => ({
            entityType: "TEAM" as const,
            entityId: t.id,
            label: t.name,
            impact: "No owner assigned",
          })),
          expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.OWNERSHIP * 1000),
        })
      );
    }

    // Check for roles without backup (secondaryPersonIds is empty)
    const rolesWithoutBackup = roleCoverages.filter(
      (r) => r.primaryPersonId && r.secondaryPersonIds.length === 0
    );
    if (rolesWithoutBackup.length > 0) {
      insights.push(
        createInsight({
          trigger: "COVERAGE_GAP",
          category: "OWNERSHIP",
          priority: rolesWithoutBackup.length > 5 ? "HIGH" : "MEDIUM",
          title: `${rolesWithoutBackup.length} critical roles without backup`,
          description: `There are ${rolesWithoutBackup.length} roles with a primary owner but no backup. This creates single points of failure.`,
          confidence: 0.85,
          recommendations: [
            {
              id: randomUUID(),
              action: "Assign backup coverage for critical roles",
              actionType: "CONFIGURE",
              deepLink: "/org/coverage",
              confidence: 0.8,
            },
          ],
          evidence: [
            { path: "roles.withoutBackupCount", value: rolesWithoutBackup.length },
          ],
          affectedEntities: [],
          expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.OWNERSHIP * 1000),
        })
      );
    }

    return insights;
  } catch (error) {
    logger.error("[InsightDetector] Coverage detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// Skill Gap Insights
// =============================================================================

/**
 * Detect skill-related insights.
 * - Critical skills with only one expert (single point of failure)
 * - Skills required by projects but not available in teams
 */
export async function detectSkillGapInsights(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();

  try {
    // Load skill data
    const [personSkills, skills] = await Promise.all([
      prisma.personSkill.findMany({
        where: { workspaceId },
        select: {
          id: true,
          personId: true,
          skillId: true,
          proficiency: true,
        },
      }),
      prisma.skill.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          category: true,
        },
      }),
    ]);

    // Build skill map
    const skillById = new Map(skills.map((s) => [s.id, s]));

    // Count experts per skill (proficiency >= 4 = expert)
    const expertsBySkill = new Map<string, string[]>();
    for (const ps of personSkills) {
      if (ps.proficiency >= 4) {
        const experts = expertsBySkill.get(ps.skillId) || [];
        experts.push(ps.personId);
        expertsBySkill.set(ps.skillId, experts);
      }
    }

    // Check for single points of failure (skills with only 1 expert)
    const singleExpertSkills: Array<{ skillId: string; skillName: string; expertId: string }> = [];
    for (const [skillId, experts] of expertsBySkill) {
      if (experts.length === 1) {
        const skill = skillById.get(skillId);
        if (skill) {
          singleExpertSkills.push({
            skillId,
            skillName: skill.name,
            expertId: experts[0],
          });
        }
      }
    }

    if (singleExpertSkills.length > 0) {
      insights.push(
        createInsight({
          trigger: "COVERAGE_GAP",
          category: "SKILL_GAP",
          priority: singleExpertSkills.length > 5 ? "HIGH" : "MEDIUM",
          title: `${singleExpertSkills.length} skills with single expert`,
          description: `There are ${singleExpertSkills.length} skills where only one person has expert-level proficiency. This creates knowledge concentration risk.`,
          confidence: 0.85,
          recommendations: [
            {
              id: randomUUID(),
              action: "Cross-train team members on critical skills",
              actionType: "CONFIGURE",
              deepLink: "/org/skills",
              confidence: 0.8,
            },
            {
              id: randomUUID(),
              action: "Document knowledge for these skills",
              actionType: "CREATE",
              confidence: 0.7,
            },
          ],
          evidence: [
            { path: "skills.singleExpertCount", value: singleExpertSkills.length },
            { path: "skills.names", value: singleExpertSkills.slice(0, 5).map((s) => s.skillName) },
          ],
          affectedEntities: singleExpertSkills.slice(0, 5).map((s) => ({
            entityType: "SKILL" as const,
            entityId: s.skillId,
            label: s.skillName,
            impact: "Single point of failure",
          })),
          expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.SKILL_GAP * 1000),
        })
      );
    }

    // Check for skills with no experts at all
    const skillsWithNoExperts = skills.filter((s) => !expertsBySkill.has(s.id));
    if (skillsWithNoExperts.length > 0) {
      insights.push(
        createInsight({
          trigger: "COVERAGE_GAP",
          category: "SKILL_GAP",
          priority: skillsWithNoExperts.length > 10 ? "MEDIUM" : "LOW",
          title: `${skillsWithNoExperts.length} skills without experts`,
          description: `There are ${skillsWithNoExperts.length} skills defined in the system with no expert-level practitioners. Consider training or hiring.`,
          confidence: 0.75,
          recommendations: [
            {
              id: randomUUID(),
              action: "Review skill requirements and training needs",
              actionType: "REVIEW",
              deepLink: "/org/skills",
              confidence: 0.7,
            },
          ],
          evidence: [
            { path: "skills.noExpertCount", value: skillsWithNoExperts.length },
          ],
          affectedEntities: skillsWithNoExperts.slice(0, 5).map((s) => ({
            entityType: "SKILL" as const,
            entityId: s.id,
            label: s.name,
            impact: "No expert available",
          })),
          expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.SKILL_GAP * 1000),
        })
      );
    }

    return insights;
  } catch (error) {
    logger.error("[InsightDetector] Skill gap detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// Communication Insights
// =============================================================================

/**
 * Detect communication-related insights.
 * - Decision domains without clear owners
 * - Teams without communication channels
 */
export async function detectCommunicationInsights(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();

  try {
    // Load decision domain data (uses DecisionAuthority relation for owner)
    const decisionDomainsRaw = await prisma.decisionDomain.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        authority: {
          select: {
            primaryPersonId: true,
          },
        },
      },
    });

    // Transform to expected format
    const decisionDomains = decisionDomainsRaw.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      ownerId: d.authority?.primaryPersonId ?? null,
    }));

    // Check for decision domains without owners
    const unownedDomains = decisionDomains.filter((d) => !d.ownerId);
    if (unownedDomains.length > 0) {
      insights.push(
        createInsight({
          trigger: "COVERAGE_GAP",
          category: "COMMUNICATION",
          priority: unownedDomains.length > 3 ? "HIGH" : "MEDIUM",
          title: `${unownedDomains.length} decision domains without owners`,
          description: `There are ${unownedDomains.length} decision domains without designated owners. This can lead to unclear accountability and delayed decisions.`,
          confidence: 0.9,
          recommendations: [
            {
              id: randomUUID(),
              action: "Assign owners to decision domains",
              actionType: "CONFIGURE",
              deepLink: "/org/admin/decisions",
              confidence: 0.85,
            },
          ],
          evidence: [
            { path: "domains.unownedCount", value: unownedDomains.length },
            { path: "domains.names", value: unownedDomains.slice(0, 5).map((d) => d.name) },
          ],
          affectedEntities: unownedDomains.slice(0, 5).map((d) => ({
            entityType: "DECISION_DOMAIN" as const,
            entityId: d.id,
            label: d.name,
            impact: "No owner assigned",
          })),
          expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.COMMUNICATION * 1000),
        })
      );
    }

    return insights;
  } catch (error) {
    logger.error("[InsightDetector] Communication detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// Project Health Insights
// =============================================================================

/**
 * Detect project health insights.
 * - Deadline clusters
 * - Stalled projects (no activity in X days)
 * - Projects with low completion rate
 */
export async function detectProjectHealthInsights(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Load project and task data
    const [projects, tasks] = await Promise.all([
      // ProjectStatus enum: ACTIVE, ON_HOLD, COMPLETED, CANCELLED (no ARCHIVED)
      prisma.project.findMany({
        where: {
          workspaceId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
        },
      }),
      prisma.task.findMany({
        where: { workspaceId },
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          projectId: true,
          updatedAt: true,
        },
      }),
    ]);

    // Group tasks by project
    const tasksByProject = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const existing = tasksByProject.get(task.projectId) || [];
      existing.push(task);
      tasksByProject.set(task.projectId, existing);
    }

    // Check for stalled projects
    const stalledProjects = projects.filter((p) => {
      const projectTasks = tasksByProject.get(p.id) || [];
      const hasRecentActivity = projectTasks.some(
        (t) => t.updatedAt > sevenDaysAgo
      );
      return !hasRecentActivity && p.updatedAt < sevenDaysAgo;
    });

    if (stalledProjects.length > 0) {
      insights.push(
        createInsight({
          trigger: "PATTERN_DETECTED",
          category: "PROJECT",
          priority: stalledProjects.length > 3 ? "HIGH" : "MEDIUM",
          title: `${stalledProjects.length} projects with no recent activity`,
          description: `There are ${stalledProjects.length} active projects with no task updates in the last 7 days. These may need attention or status updates.`,
          confidence: 0.8,
          recommendations: [
            {
              id: randomUUID(),
              action: "Review stalled projects and update status",
              actionType: "REVIEW",
              deepLink: "/projects?filter=stalled",
              confidence: 0.75,
            },
          ],
          evidence: [
            { path: "projects.stalledCount", value: stalledProjects.length },
            { path: "projects.names", value: stalledProjects.slice(0, 5).map((p) => p.name) },
          ],
          affectedEntities: stalledProjects.slice(0, 5).map((p) => ({
            entityType: "PROJECT" as const,
            entityId: p.id,
            label: p.name,
            impact: "No recent activity",
          })),
          expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.PROJECT * 1000),
        })
      );
    }

    // Check for deadline clusters (from original detectDeadlineInsights)
    const tasksWithDeadlines = tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate >= now &&
        t.dueDate <= twoWeeksFromNow &&
        t.status !== "DONE"
    );

    const tasksByDate = new Map<string, typeof tasks>();
    for (const task of tasksWithDeadlines) {
      if (!task.dueDate) continue;
      const dateKey = task.dueDate.toISOString().split("T")[0];
      const existing = tasksByDate.get(dateKey) || [];
      existing.push(task);
      tasksByDate.set(dateKey, existing);
    }

    for (const [dateKey, dateTasks] of tasksByDate) {
      if (dateTasks.length >= 3) {
        const dueDate = new Date(dateKey);
        const daysUntil = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        insights.push(
          createInsight({
            trigger: "DEADLINE_APPROACHING",
            category: "PROJECT",
            priority: daysUntil <= 3 ? "HIGH" : "MEDIUM",
            title: `${dateTasks.length} tasks due on ${dateKey}`,
            description: `There are ${dateTasks.length} tasks due on ${dateKey} (${daysUntil} days from now). This deadline cluster may require attention.`,
            confidence: 0.85,
            recommendations: [
              {
                id: randomUUID(),
                action: "Review deadline cluster and prioritize",
                actionType: "REVIEW",
                confidence: 0.8,
              },
              {
                id: randomUUID(),
                action: "Consider deferring non-critical tasks",
                actionType: "DEFER",
                confidence: 0.6,
              },
            ],
            evidence: [
              { path: "deadline.taskCount", value: dateTasks.length },
              { path: "deadline.date", value: dateKey },
              { path: "deadline.daysUntil", value: daysUntil },
            ],
            affectedEntities: dateTasks.slice(0, 5).map((t) => ({
              entityType: "TASK" as const,
              entityId: t.id,
              label: t.title,
              impact: `Due ${dateKey}`,
            })),
            expiresAt: dueDate,
          })
        );
      }
    }

    // Check for projects with low completion rate
    for (const project of projects) {
      const projectTasks = tasksByProject.get(project.id) || [];
      if (projectTasks.length < 5) continue; // Skip small projects

      const completedTasks = projectTasks.filter((t) => t.status === "DONE");
      const completionRate = completedTasks.length / projectTasks.length;

      // Projects with many tasks but low completion
      if (completionRate < 0.2 && projectTasks.length >= 10) {
        insights.push(
          createInsight({
            trigger: "THRESHOLD_BREACH",
            category: "PROJECT",
            priority: completionRate < 0.1 ? "HIGH" : "MEDIUM",
            title: `${project.name} has ${Math.round(completionRate * 100)}% completion`,
            description: `Project "${project.name}" has ${projectTasks.length} tasks but only ${Math.round(completionRate * 100)}% are completed. This may indicate blockers or scope issues.`,
            confidence: 0.75,
            recommendations: [
              {
                id: randomUUID(),
                action: "Review project scope and blockers",
                actionType: "REVIEW",
                deepLink: `/projects/${project.id}`,
                confidence: 0.7,
              },
            ],
            evidence: [
              { path: "project.completionRate", value: completionRate },
              { path: "project.totalTasks", value: projectTasks.length },
              { path: "project.completedTasks", value: completedTasks.length },
            ],
            affectedEntities: [
              {
                entityType: "PROJECT",
                entityId: project.id,
                label: project.name,
                impact: "Low completion rate",
              },
            ],
            expiresAt: new Date(now.getTime() + INSIGHT_TTL_DEFAULTS_V0.PROJECT * 1000),
          })
        );
      }
    }

    return insights;
  } catch (error) {
    logger.error("[InsightDetector] Project health detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// Storage Functions
// =============================================================================

/**
 * Store detected insights in the database.
 * Handles deduplication by superseding similar existing insights.
 */
export async function storeInsights(
  workspaceId: string,
  insights: ProactiveInsightV0[]
): Promise<void> {
  if (insights.length === 0) return;

  try {
    // Get existing active insights for deduplication
    const existingInsights = await prisma.proactiveInsight.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        category: true,
        title: true,
      },
    });

    // Build map for deduplication
    const existingByKey = new Map(
      existingInsights.map((i) => [`${i.category}:${i.title}`, i.id])
    );

    // Create new insights, superseding duplicates
    for (const insight of insights) {
      const key = `${insight.category}:${insight.title}`;
      const existingId = existingByKey.get(key);

      await prisma.proactiveInsight.create({
        data: {
          workspaceId,
          trigger: insight.trigger,
          category: insight.category,
          priority: insight.priority,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          recommendations: insight.recommendations as object,
          evidence: insight.evidence as object,
          affectedEntities: insight.affectedEntities as object,
          status: "ACTIVE",
          expiresAt: insight.expiresAt ? new Date(insight.expiresAt) : null,
          supersedesId: existingId || null,
          metadata: insight.metadata as object || null,
        },
      });

      // Mark superseded insight
      if (existingId) {
        await prisma.proactiveInsight.update({
          where: { id: existingId },
          data: { status: "SUPERSEDED" },
        });
      }
    }

    logger.info("[InsightDetector] Insights stored", {
      workspaceId,
      count: insights.length,
    });
  } catch (error) {
    logger.error("[InsightDetector] Failed to store insights", {
      workspaceId,
      error,
    });
    throw error;
  }
}

/**
 * Expire stale insights that have passed their expiration date.
 */
export async function expireStaleInsights(workspaceId: string): Promise<number> {
  try {
    const result = await prisma.proactiveInsight.updateMany({
      where: {
        workspaceId,
        status: "ACTIVE",
        expiresAt: { lt: new Date() },
      },
      data: {
        status: "EXPIRED",
      },
    });

    if (result.count > 0) {
      logger.info("[InsightDetector] Expired stale insights", {
        workspaceId,
        count: result.count,
      });
    }

    return result.count;
  } catch (error) {
    logger.error("[InsightDetector] Failed to expire insights", {
      workspaceId,
      error,
    });
    return 0;
  }
}

// =============================================================================
// Batch Functions
// =============================================================================

/**
 * Build an insight batch from detected insights.
 */
export function buildInsightBatch(
  workspaceId: string,
  insights: ProactiveInsightV0[]
): InsightBatchV0 {
  const now = new Date().toISOString();
  const activeInsights = insights.filter((i) => i.status === "ACTIVE");

  // Build summary
  const summary: InsightBatchSummaryV0 = {
    totalCount: insights.length,
    activeCount: activeInsights.length,
    byPriority: {},
    byCategory: {},
    byTrigger: {},
    mostCritical: null,
    avgConfidence: 0,
  };

  // Calculate counts
  for (const insight of activeInsights) {
    summary.byPriority[insight.priority] =
      (summary.byPriority[insight.priority] || 0) + 1;
    summary.byCategory[insight.category] =
      (summary.byCategory[insight.category] || 0) + 1;
    summary.byTrigger[insight.trigger] =
      (summary.byTrigger[insight.trigger] || 0) + 1;
  }

  // Find most critical
  const sorted = sortInsightsByUrgency(activeInsights);
  summary.mostCritical = sorted[0] || null;

  // Calculate average confidence
  if (activeInsights.length > 0) {
    summary.avgConfidence =
      activeInsights.reduce((sum, i) => sum + i.confidence, 0) /
      activeInsights.length;
  }

  // Calculate TTL (use shortest category TTL)
  const ttlSeconds = Math.min(
    ...activeInsights.map((i) => INSIGHT_TTL_DEFAULTS_V0[i.category])
  ) || 3600;

  return {
    schemaVersion: "v0",
    generatedAt: now,
    workspaceId,
    insights,
    summary,
    freshness: calculateBatchFreshness(now, ttlSeconds),
    ttlSeconds,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function createInsight(input: InsightInput): ProactiveInsightV0 {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    trigger: input.trigger,
    category: input.category,
    priority: input.priority,
    title: input.title,
    description: input.description,
    confidence: input.confidence,
    recommendations: input.recommendations,
    evidence: input.evidence,
    affectedEntities: input.affectedEntities,
    createdAt: now,
    expiresAt: input.expiresAt?.toISOString() || null,
    status: "ACTIVE",
    metadata: input.metadata,
  };
}
