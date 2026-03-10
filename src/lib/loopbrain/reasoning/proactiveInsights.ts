/**
 * Proactive Insights Generator
 *
 * Generates user-facing proactive insights by querying live workspace data.
 * Each generator is a pure DB-read + logic function that produces
 * ProactiveInsightV0[] for the InsightBatchV0 pipeline.
 *
 * Insight types:
 * 1. OVERDUE_TASKS     — Tasks past due date, not completed
 * 2. AT_RISK_GOALS     — Goals behind schedule (variance < -15%)
 * 3. OVERLOADED_TEAM   — Team members at >100% allocation
 * 4. UPCOMING_REVIEWS  — Performance review cycles approaching deadline
 * 5. UPCOMING_1ON1     — Upcoming 1:1s with overdue action items
 * 6. STALE_WIKI_PAGES  — Published wiki pages not updated in 30+ days
 * 7. PROJECT_HEALTH_ALERT — Projects stalled or with low completion
 *
 * @see src/lib/loopbrain/contract/proactiveInsight.v0.ts
 * @see src/lib/loopbrain/insight-detector.ts
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import type {
  ProactiveInsightV0,
  InsightPriorityV0,
  RecommendationV0,
  InsightEvidenceV0,
  AffectedEntityV0,
} from "../contract/proactiveInsight.v0";
import { INSIGHT_TTL_DEFAULTS_V0 } from "../contract/proactiveInsight.v0";
import { scanProjectHealth } from "../scenarios/project-health-scanner";
import type { ProjectHealthAlertSeverity } from "../scenarios/project-health-scanner";

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate all user-facing proactive insights for a workspace.
 * Runs all 7 generators in parallel and returns aggregated results.
 */
export async function generateProactiveInsights(
  workspaceId: string,
  userId: string
): Promise<ProactiveInsightV0[]> {
  const startTime = Date.now();

  try {
    const results = await Promise.all([
      detectOverdueTasks(workspaceId, userId),
      detectAtRiskGoals(workspaceId),
      detectOverloadedTeam(workspaceId),
      detectUpcomingReviews(workspaceId),
      detectUpcoming1on1s(workspaceId, userId),
      detectStaleWikiPages(workspaceId),
      detectProjectHealthAlerts(workspaceId),
    ]);

    const insights = results.flat();

    logger.info("[ProactiveInsights] Generation complete", {
      workspaceId,
      insightCount: insights.length,
      durationMs: Date.now() - startTime,
    });

    return insights;
  } catch (error) {
    logger.error("[ProactiveInsights] Generation failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// 1. OVERDUE_TASKS
// =============================================================================

/**
 * Detect tasks past their due date that are not completed.
 * Scopes to the requesting user's assigned tasks by default,
 * plus any project-level overdue clusters.
 */
export async function detectOverdueTasks(
  workspaceId: string,
  userId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();

  try {
    const overdueTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        dueDate: { lt: now },
        status: { notIn: ["DONE"] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        assigneeId: true,
        projectId: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 100,
    });

    if (overdueTasks.length === 0) return insights;

    // Personal overdue tasks
    const myOverdue = overdueTasks.filter((t) => t.assigneeId === userId);
    if (myOverdue.length > 0) {
      const oldestDue = myOverdue[0].dueDate!;
      const daysPastDue = Math.ceil(
        (now.getTime() - oldestDue.getTime()) / (24 * 60 * 60 * 1000)
      );

      const priority: InsightPriorityV0 =
        myOverdue.length > 5 ? "HIGH" : myOverdue.length > 2 ? "MEDIUM" : "LOW";

      insights.push(
        createInsight({
          trigger: "DEADLINE_APPROACHING",
          category: "WORKLOAD",
          priority,
          title: `${myOverdue.length} overdue task${myOverdue.length !== 1 ? "s" : ""} assigned to you`,
          description: `You have ${myOverdue.length} task${myOverdue.length !== 1 ? "s" : ""} past their due date. The oldest is ${daysPastDue} day${daysPastDue !== 1 ? "s" : ""} overdue.`,
          confidence: 0.95,
          recommendations: [
            rec(
              "Review and prioritize overdue tasks",
              "REVIEW",
              "/my-tasks?filter=overdue",
              0.9
            ),
            ...(myOverdue.length > 3
              ? [
                  rec(
                    "Consider deferring lower-priority items",
                    "DEFER",
                    undefined,
                    0.7
                  ),
                ]
              : []),
          ],
          evidence: [
            { path: "tasks.overdueCount", value: myOverdue.length },
            { path: "tasks.oldestOverdueDays", value: daysPastDue },
          ],
          affectedEntities: myOverdue.slice(0, 5).map((t) => ({
            entityType: "TASK" as const,
            entityId: t.id,
            label: t.title,
            impact: `Overdue since ${t.dueDate!.toISOString().split("T")[0]}`,
          })),
          ttlCategory: "WORKLOAD",
        })
      );
    }

    // Workspace-wide overdue summary (if user has visibility)
    if (overdueTasks.length > myOverdue.length) {
      const otherOverdue = overdueTasks.length - myOverdue.length;
      insights.push(
        createInsight({
          trigger: "THRESHOLD_BREACH",
          category: "WORKLOAD",
          priority: otherOverdue > 10 ? "HIGH" : "MEDIUM",
          title: `${overdueTasks.length} total overdue tasks across workspace`,
          description: `There are ${overdueTasks.length} overdue tasks in total (${myOverdue.length} yours, ${otherOverdue} others).`,
          confidence: 0.9,
          recommendations: [
            rec(
              "Review workspace task deadlines",
              "REVIEW",
              "/projects",
              0.8
            ),
          ],
          evidence: [
            { path: "tasks.totalOverdue", value: overdueTasks.length },
            { path: "tasks.myOverdue", value: myOverdue.length },
          ],
          affectedEntities: [],
          ttlCategory: "WORKLOAD",
        })
      );
    }

    return insights;
  } catch (error) {
    logger.error("[ProactiveInsights] Overdue tasks detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// 2. AT_RISK_GOALS
// =============================================================================

/**
 * Detect goals that are behind schedule.
 * Uses time-based expected progress vs actual progress.
 */
export async function detectAtRiskGoals(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();

  try {
    const goals = await prisma.goal.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
      },
      include: {
        owner: { select: { name: true } },
      },
    });

    const atRiskGoals: Array<{
      id: string;
      title: string;
      ownerName: string | null;
      variance: number;
      actualProgress: number;
      expectedProgress: number;
      daysRemaining: number;
    }> = [];

    for (const goal of goals) {
      if (!goal.startDate || !goal.endDate) continue;

      const totalDuration = goal.endDate.getTime() - goal.startDate.getTime();
      if (totalDuration <= 0) continue;

      const elapsed = now.getTime() - goal.startDate.getTime();
      const expectedProgress = Math.min((elapsed / totalDuration) * 100, 100);
      const actualProgress = goal.progress;
      const variance = actualProgress - expectedProgress;
      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (goal.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
      );

      // At risk: more than 15% behind schedule
      if (variance < -15) {
        atRiskGoals.push({
          id: goal.id,
          title: goal.title,
          ownerName: goal.owner?.name ?? null,
          variance,
          actualProgress,
          expectedProgress,
          daysRemaining,
        });
      }
    }

    if (atRiskGoals.length === 0) return insights;

    // Sort by variance (most behind first)
    atRiskGoals.sort((a, b) => a.variance - b.variance);

    const priority: InsightPriorityV0 =
      atRiskGoals.some((g) => g.variance < -30 && g.daysRemaining < 14)
        ? "CRITICAL"
        : atRiskGoals.length > 3
          ? "HIGH"
          : "MEDIUM";

    insights.push(
      createInsight({
        trigger: "THRESHOLD_BREACH",
        category: "PROJECT",
        priority,
        title: `${atRiskGoals.length} goal${atRiskGoals.length !== 1 ? "s" : ""} at risk`,
        description: buildAtRiskGoalDescription(atRiskGoals),
        confidence: 0.85,
        recommendations: [
          rec("Review at-risk goals", "REVIEW", "/goals", 0.85),
          ...(atRiskGoals.some((g) => g.daysRemaining < 7)
            ? [
                rec(
                  "Escalate goals nearing deadline",
                  "ESCALATE",
                  undefined,
                  0.8
                ),
              ]
            : []),
        ],
        evidence: [
          { path: "goals.atRiskCount", value: atRiskGoals.length },
          {
            path: "goals.worstVariance",
            value: Math.round(atRiskGoals[0].variance),
          },
        ],
        affectedEntities: atRiskGoals.slice(0, 5).map((g) => ({
          entityType: "PROJECT" as const,
          entityId: g.id,
          label: g.title,
          impact: `${Math.round(g.variance)}% behind schedule`,
        })),
        ttlCategory: "PROJECT",
      })
    );

    return insights;
  } catch (error) {
    logger.error("[ProactiveInsights] At-risk goals detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// 3. OVERLOADED_TEAM
// =============================================================================

/**
 * Detect team members over-allocated (>100% capacity).
 */
export async function detectOverloadedTeam(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();

  try {
    const allocations = await prisma.workAllocation.findMany({
      where: {
        workspaceId,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: {
        personId: true,
        allocationPercent: true,
      },
    });

    // Sum allocations per person
    const allocationByPerson = new Map<
      string,
      { total: number }
    >();
    for (const a of allocations) {
      const existing = allocationByPerson.get(a.personId) || { total: 0 };
      existing.total += a.allocationPercent;
      allocationByPerson.set(a.personId, existing);
    }

    // Fetch names for overloaded people
    const overloadedPersonIds = [...allocationByPerson.entries()]
      .filter(([, data]) => data.total > 1.0)
      .map(([id]) => id);

    if (overloadedPersonIds.length === 0) return insights;

    const people = await prisma.user.findMany({
      where: { id: { in: overloadedPersonIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(people.map((p) => [p.id, p.name ?? "Unknown"]));

    const overloaded: Array<{
      personId: string;
      name: string;
      allocation: number;
    }> = [];
    for (const personId of overloadedPersonIds) {
      const data = allocationByPerson.get(personId)!;
      overloaded.push({
        personId,
        name: nameMap.get(personId) ?? "Unknown",
        allocation: data.total,
      });
    }

    overloaded.sort((a, b) => b.allocation - a.allocation);

    const priority: InsightPriorityV0 =
      overloaded.some((p) => p.allocation > 1.3)
        ? "HIGH"
        : overloaded.length > 3
          ? "HIGH"
          : "MEDIUM";

    insights.push(
      createInsight({
        trigger: "THRESHOLD_BREACH",
        category: "CAPACITY",
        priority,
        title: `${overloaded.length} team member${overloaded.length !== 1 ? "s" : ""} overloaded`,
        description: `${overloaded.length} people are allocated above 100% capacity. The most overloaded is at ${Math.round(overloaded[0].allocation * 100)}%.`,
        confidence: 0.9,
        recommendations: [
          rec(
            "Redistribute workload across team",
            "REASSIGN",
            "/org/admin/capacity",
            0.85
          ),
          rec(
            "Review project allocations",
            "REVIEW",
            "/projects",
            0.75
          ),
        ],
        evidence: [
          { path: "capacity.overloadedCount", value: overloaded.length },
          {
            path: "capacity.maxAllocation",
            value: overloaded[0].allocation,
          },
        ],
        affectedEntities: overloaded.slice(0, 5).map((p) => ({
          entityType: "PERSON" as const,
          entityId: p.personId,
          label: p.name,
          impact: `${Math.round(p.allocation * 100)}% allocated`,
        })),
        ttlCategory: "CAPACITY",
      })
    );

    return insights;
  } catch (error) {
    logger.error("[ProactiveInsights] Overloaded team detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// 4. UPCOMING_REVIEWS
// =============================================================================

/**
 * Detect performance review cycles approaching their deadline
 * with incomplete reviews.
 */
export async function detectUpcomingReviews(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();
  const twoWeeksFromNow = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000
  );

  try {
    const cycles = await prisma.performanceCycle.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
        dueDate: { gte: now, lte: twoWeeksFromNow },
      },
      select: {
        id: true,
        name: true,
        dueDate: true,
        reviews: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    for (const cycle of cycles) {
      const totalReviews = cycle.reviews.length;
      if (totalReviews === 0) continue;

      const completedReviews = cycle.reviews.filter(
        (r) => r.status === "COMPLETED" || r.status === "FINALIZED"
      ).length;
      const incompleteReviews = totalReviews - completedReviews;

      if (incompleteReviews === 0) continue;

      const daysUntilDue = Math.ceil(
        (cycle.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      const priority: InsightPriorityV0 =
        daysUntilDue <= 3
          ? "CRITICAL"
          : daysUntilDue <= 7
            ? "HIGH"
            : "MEDIUM";

      insights.push(
        createInsight({
          trigger: "DEADLINE_APPROACHING",
          category: "PROCESS",
          priority,
          title: `${cycle.name}: ${incompleteReviews} reviews due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`,
          description: `Performance cycle "${cycle.name}" has ${incompleteReviews} of ${totalReviews} reviews incomplete. Deadline: ${cycle.dueDate.toISOString().split("T")[0]}.`,
          confidence: 0.92,
          recommendations: [
            rec(
              "Complete pending reviews",
              "REVIEW",
              // Performance module removed from MVP — re-enable in v1
              undefined,
              0.9
            ),
            ...(daysUntilDue <= 3
              ? [
                  rec(
                    "Send reminders to reviewers",
                    "NOTIFY",
                    undefined,
                    0.85
                  ),
                ]
              : []),
          ],
          evidence: [
            { path: "reviews.incompleteCount", value: incompleteReviews },
            { path: "reviews.totalCount", value: totalReviews },
            { path: "reviews.daysUntilDue", value: daysUntilDue },
          ],
          affectedEntities: [],
          ttlCategory: "PROCESS",
        })
      );
    }

    return insights;
  } catch (error) {
    logger.error("[ProactiveInsights] Upcoming reviews detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// 5. UPCOMING_1ON1
// =============================================================================

/**
 * Detect upcoming 1:1 meetings that have overdue action items from past meetings.
 */
export async function detectUpcoming1on1s(
  workspaceId: string,
  userId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const now = new Date();
  const oneWeekFromNow = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000
  );

  try {
    // Find upcoming 1:1 meetings for this user
    const upcomingMeetings = await prisma.oneOnOneMeeting.findMany({
      where: {
        workspaceId,
        status: "SCHEDULED",
        scheduledAt: { gte: now, lte: oneWeekFromNow },
        OR: [{ managerId: userId }, { employeeId: userId }],
      },
      select: {
        id: true,
        scheduledAt: true,
        managerId: true,
        employeeId: true,
        manager: { select: { name: true } },
        employee: { select: { name: true } },
        seriesId: true,
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    });

    if (upcomingMeetings.length === 0) return insights;

    // perf: eliminated N+1 — batch fetch all open action items for all upcoming meeting pairs (was: one query per meeting, up to 20)
    // Uses @@index([workspaceId, scheduledAt]) and @@index([workspaceId, assigneeId, status]) added in index audit
    const uniquePairs = Array.from(
      new Map(
        upcomingMeetings.map((m) => [
          `${m.managerId}:${m.employeeId}`,
          { managerId: m.managerId, employeeId: m.employeeId },
        ])
      ).values()
    );

    const allOverdueActions = await prisma.oneOnOneActionItem.findMany({
      where: {
        workspaceId,
        status: "OPEN",
        meeting: {
          OR: uniquePairs.map((p) => ({
            managerId: p.managerId,
            employeeId: p.employeeId,
          })),
          scheduledAt: { lt: now },
        },
      },
      select: {
        id: true,
        content: true,
        assigneeId: true,
        dueDate: true,
        meeting: {
          select: {
            managerId: true,
            employeeId: true,
          },
        },
      },
      take: 200,
    });

    // Group action items by managerId:employeeId key for O(1) lookup in the loop below
    const actionsByPair = new Map<string, typeof allOverdueActions>();
    for (const action of allOverdueActions) {
      const key = `${action.meeting.managerId}:${action.meeting.employeeId}`;
      if (!actionsByPair.has(key)) actionsByPair.set(key, []);
      actionsByPair.get(key)!.push(action);
    }

    // Check for overdue action items from past meetings in the same series
    for (const meeting of upcomingMeetings) {
      const otherPersonName =
        meeting.managerId === userId
          ? meeting.employee?.name ?? "team member"
          : meeting.manager?.name ?? "manager";

      // Look up pre-loaded action items for this meeting pair (no additional query)
      const pairKey = `${meeting.managerId}:${meeting.employeeId}`;
      const overdueActions = (actionsByPair.get(pairKey) ?? []).slice(0, 10);

      if (overdueActions.length === 0) continue;

      const daysUntilMeeting = Math.ceil(
        (meeting.scheduledAt.getTime() - now.getTime()) /
          (24 * 60 * 60 * 1000)
      );

      insights.push(
        createInsight({
          trigger: "SCHEDULED_CHECK",
          category: "COMMUNICATION",
          priority: overdueActions.length > 3 ? "MEDIUM" : "LOW",
          title: `1:1 with ${otherPersonName}: ${overdueActions.length} open action item${overdueActions.length !== 1 ? "s" : ""}`,
          description: `You have a 1:1 with ${otherPersonName} in ${daysUntilMeeting} day${daysUntilMeeting !== 1 ? "s" : ""}. There are ${overdueActions.length} open action items from previous meetings.`,
          confidence: 0.88,
          recommendations: [
            rec(
              "Review open action items before meeting",
              "REVIEW",
              `/org/1on1/${meeting.id}`,
              0.9
            ),
          ],
          evidence: [
            { path: "oneOnOne.openActions", value: overdueActions.length },
            { path: "oneOnOne.daysUntilMeeting", value: daysUntilMeeting },
          ],
          affectedEntities: [
            {
              entityType: "PERSON" as const,
              entityId:
                meeting.managerId === userId
                  ? meeting.employeeId
                  : meeting.managerId,
              label: otherPersonName,
              impact: "Upcoming 1:1 participant",
            },
          ],
          ttlCategory: "COMMUNICATION",
        })
      );
    }

    return insights;
  } catch (error) {
    logger.error("[ProactiveInsights] Upcoming 1:1 detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// 6. STALE_WIKI_PAGES
// =============================================================================

/**
 * Detect published wiki pages not updated in 30+ days.
 * Focuses on featured and high-traffic pages.
 */
export async function detectStaleWikiPages(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  const insights: ProactiveInsightV0[] = [];
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  );

  try {
    const stalePages = await prisma.wikiPage.findMany({
      where: {
        workspaceId,
        isPublished: true,
        updatedAt: { lt: thirtyDaysAgo },
        workspace_type: "team", // Only team pages, not personal
      },
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
        is_featured: true,
        view_count: true,
      },
      orderBy: [
        { is_featured: "desc" },
        { view_count: "desc" },
      ],
      take: 50,
    });

    if (stalePages.length === 0) return insights;

    const featuredStale = stalePages.filter((p) => p.is_featured);
    const highTraffic = stalePages.filter(
      (p) => (p.view_count ?? 0) > 10
    );

    const priority: InsightPriorityV0 =
      featuredStale.length > 0
        ? "MEDIUM"
        : highTraffic.length > 5
          ? "MEDIUM"
          : "LOW";

    const description =
      featuredStale.length > 0
        ? `${stalePages.length} wiki pages haven't been updated in 30+ days, including ${featuredStale.length} featured page${featuredStale.length !== 1 ? "s" : ""}.`
        : `${stalePages.length} wiki pages haven't been updated in 30+ days.`;

    insights.push(
      createInsight({
        trigger: "PATTERN_DETECTED",
        category: "PROCESS",
        priority,
        title: `${stalePages.length} stale wiki page${stalePages.length !== 1 ? "s" : ""}`,
        description,
        confidence: 0.8,
        recommendations: [
          rec(
            "Review and update stale documentation",
            "REVIEW",
            "/wiki",
            0.8
          ),
          ...(featuredStale.length > 0
            ? [
                rec(
                  "Prioritize featured pages for updates",
                  "REVIEW",
                  `/wiki/${featuredStale[0].slug}`,
                  0.85
                ),
              ]
            : []),
        ],
        evidence: [
          { path: "wiki.staleCount", value: stalePages.length },
          { path: "wiki.featuredStaleCount", value: featuredStale.length },
          { path: "wiki.highTrafficStaleCount", value: highTraffic.length },
        ],
        affectedEntities: stalePages.slice(0, 5).map((p) => ({
          entityType: "PROJECT" as const,
          entityId: p.id,
          label: p.title,
          impact: `Last updated ${p.updatedAt.toISOString().split("T")[0]}`,
        })),
        ttlCategory: "PROCESS",
      })
    );

    return insights;
  } catch (error) {
    logger.error("[ProactiveInsights] Stale wiki detection failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// 7. PROJECT_HEALTH_ALERT
// =============================================================================

/**
 * Detect project health alerts by delegating to the project health scanner.
 * The scanner computes 6 risk types: velocity drop, dependency blocks,
 * allocation conflicts, deadline risk, ownership gaps, and stale projects.
 *
 * @see src/lib/loopbrain/scenarios/project-health-scanner.ts
 */
export async function detectProjectHealthAlerts(
  workspaceId: string
): Promise<ProactiveInsightV0[]> {
  try {
    const alerts = await scanProjectHealth(workspaceId);

    return alerts.map((alert) =>
      createInsight({
        trigger:
          alert.severity === "critical"
            ? "THRESHOLD_BREACH"
            : "PATTERN_DETECTED",
        category: "PROJECT",
        priority: alertSeverityToInsightPriority(alert.severity),
        title: alert.title,
        description: alert.description,
        confidence: 0.87,
        recommendations: [
          rec(
            alert.suggestedAction,
            "REVIEW",
            `/projects/${alert.projectId}`,
            0.85
          ),
        ],
        evidence: Object.entries(alert.evidence).map(([k, v]) => ({
          path: `project.health.${k}`,
          value: v,
        })),
        affectedEntities: [
          {
            entityType: "PROJECT" as const,
            entityId: alert.projectId,
            label: alert.projectName,
            impact: alert.title,
          },
        ],
        ttlCategory: "PROJECT",
        metadata: {
          alertType: alert.alertType,
          suggestedAction: alert.suggestedAction,
        },
      })
    );
  } catch (error) {
    logger.error("[ProactiveInsights] Project health alert failed", {
      workspaceId,
      error,
    });
    return [];
  }
}

function alertSeverityToInsightPriority(
  severity: ProjectHealthAlertSeverity
): InsightPriorityV0 {
  switch (severity) {
    case "critical":
      return "CRITICAL";
    case "warning":
      return "HIGH";
    case "info":
      return "MEDIUM";
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

interface InsightInput {
  trigger: ProactiveInsightV0["trigger"];
  category: ProactiveInsightV0["category"];
  priority: InsightPriorityV0;
  title: string;
  description: string;
  confidence: number;
  recommendations: RecommendationV0[];
  evidence: InsightEvidenceV0[];
  affectedEntities: AffectedEntityV0[];
  ttlCategory: ProactiveInsightV0["category"];
  metadata?: Record<string, string | number | boolean | null>;
}

function createInsight(input: InsightInput): ProactiveInsightV0 {
  const now = new Date();
  const ttlSeconds = INSIGHT_TTL_DEFAULTS_V0[input.ttlCategory];
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

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
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "ACTIVE",
    metadata: input.metadata,
  };
}

function rec(
  action: string,
  actionType: RecommendationV0["actionType"],
  deepLink: string | undefined,
  confidence: number
): RecommendationV0 {
  return {
    id: randomUUID(),
    action,
    actionType,
    deepLink,
    confidence,
  };
}

function buildAtRiskGoalDescription(
  goals: Array<{
    title: string;
    ownerName: string | null;
    variance: number;
    daysRemaining: number;
  }>
): string {
  const parts: string[] = [];

  if (goals.length === 1) {
    const g = goals[0];
    parts.push(
      `"${g.title}" is ${Math.abs(Math.round(g.variance))}% behind schedule with ${g.daysRemaining} days remaining.`
    );
  } else {
    parts.push(
      `${goals.length} goals are behind schedule.`
    );
    // Highlight the worst
    const worst = goals[0];
    parts.push(
      `Most at risk: "${worst.title}" (${Math.abs(Math.round(worst.variance))}% behind, ${worst.daysRemaining} days left).`
    );
  }

  return parts.join(" ");
}
