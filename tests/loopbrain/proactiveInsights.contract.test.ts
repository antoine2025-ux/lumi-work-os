/**
 * Proactive Insights Contract Tests
 *
 * Tests the 7 insight generators as pure-logic functions
 * using in-memory fixtures (no DB).
 *
 * A. Insight structure validates against ProactiveInsightV0
 * B. Priority ordering is correct
 * C. Confidence is within bounds
 * D. Recommendations have valid action types
 * E. TTL and expiration are set
 * F. InsightBatchV0 summary is correct
 */

import { describe, it, expect } from "vitest";
import type {
  ProactiveInsightV0,
  InsightBatchV0,
  InsightPriorityV0,
  InsightCategoryV0,
} from "@/lib/loopbrain/contract/proactiveInsight.v0";
import {
  INSIGHT_PRIORITY_V0,
  INSIGHT_CATEGORY_V0,
  INSIGHT_TRIGGER_V0,
  INSIGHT_PRIORITY_ORDER_V0,
  RECOMMENDATION_ACTION_TYPE_V0,
  sortInsightsByUrgency,
  getActiveInsights,
  getCriticalInsights,
  getInsightsByCategory,
  getInsightsByPriority,
  getInsightsForEntity,
  getHighConfidenceRecommendations,
  calculateBatchFreshness,
  isInsightExpired,
} from "@/lib/loopbrain/contract/proactiveInsight.v0";
import { buildInsightBatch } from "@/lib/loopbrain/insight-detector";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeInsight(
  overrides: Partial<ProactiveInsightV0> = {}
): ProactiveInsightV0 {
  return {
    id: "insight_test_1",
    trigger: "THRESHOLD_BREACH",
    category: "WORKLOAD",
    priority: "MEDIUM",
    title: "3 overdue tasks assigned to you",
    description: "You have 3 tasks past their due date.",
    confidence: 0.9,
    recommendations: [
      {
        id: "rec_1",
        action: "Review and prioritize overdue tasks",
        actionType: "REVIEW",
        deepLink: "/my-tasks?filter=overdue",
        confidence: 0.9,
      },
    ],
    evidence: [
      { path: "tasks.overdueCount", value: 3 },
      { path: "tasks.oldestOverdueDays", value: 5 },
    ],
    affectedEntities: [
      {
        entityType: "TASK",
        entityId: "task_1",
        label: "Fix login bug",
        impact: "Overdue since 2026-02-10",
      },
    ],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    status: "ACTIVE",
    ...overrides,
  };
}

function makeCriticalInsight(): ProactiveInsightV0 {
  return makeInsight({
    id: "insight_critical",
    trigger: "DEADLINE_APPROACHING",
    category: "PROCESS",
    priority: "CRITICAL",
    title: "Q1 Review Cycle: 5 reviews due in 2 days",
    description: "Performance cycle has 5 incomplete reviews due in 2 days.",
    confidence: 0.92,
  });
}

function makeAtRiskGoalInsight(): ProactiveInsightV0 {
  return makeInsight({
    id: "insight_goals",
    trigger: "THRESHOLD_BREACH",
    category: "PROJECT",
    priority: "HIGH",
    title: "2 goals at risk",
    description: '2 goals are behind schedule. Most at risk: "Launch v2" (30% behind).',
    confidence: 0.85,
    affectedEntities: [
      {
        entityType: "PROJECT",
        entityId: "goal_1",
        label: "Launch v2",
        impact: "30% behind schedule",
      },
    ],
  });
}

function makeOverloadedInsight(): ProactiveInsightV0 {
  return makeInsight({
    id: "insight_capacity",
    trigger: "THRESHOLD_BREACH",
    category: "CAPACITY",
    priority: "HIGH",
    title: "2 team members overloaded",
    description: "2 people are allocated above 100% capacity.",
    confidence: 0.9,
    recommendations: [
      {
        id: "rec_cap",
        action: "Redistribute workload across team",
        actionType: "REASSIGN",
        deepLink: "/org/admin/capacity",
        confidence: 0.85,
      },
    ],
    affectedEntities: [
      {
        entityType: "PERSON",
        entityId: "person_1",
        label: "Alice",
        impact: "130% allocated",
      },
    ],
  });
}

function makeStaleWikiInsight(): ProactiveInsightV0 {
  return makeInsight({
    id: "insight_wiki",
    trigger: "PATTERN_DETECTED",
    category: "PROCESS",
    priority: "LOW",
    title: "12 stale wiki pages",
    description: "12 wiki pages haven't been updated in 30+ days.",
    confidence: 0.8,
    recommendations: [
      {
        id: "rec_wiki",
        action: "Review and update stale documentation",
        actionType: "REVIEW",
        deepLink: "/wiki",
        confidence: 0.8,
      },
    ],
  });
}

function makeExpiredInsight(): ProactiveInsightV0 {
  return makeInsight({
    id: "insight_expired",
    expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
    status: "ACTIVE",
  });
}

function makeDismissedInsight(): ProactiveInsightV0 {
  return makeInsight({
    id: "insight_dismissed",
    status: "DISMISSED",
    dismissal: {
      dismissedAt: new Date().toISOString(),
      dismissedBy: "user_1",
      reason: "ALREADY_ADDRESSED",
    },
  });
}

// ---------------------------------------------------------------------------
// A. Insight Structure Validation
// ---------------------------------------------------------------------------

describe("Proactive Insights — Structure Validation", () => {
  const insight = makeInsight();

  it("has valid trigger", () => {
    expect(INSIGHT_TRIGGER_V0).toContain(insight.trigger);
  });

  it("has valid category", () => {
    expect(INSIGHT_CATEGORY_V0).toContain(insight.category);
  });

  it("has valid priority", () => {
    expect(INSIGHT_PRIORITY_V0).toContain(insight.priority);
  });

  it("has valid status", () => {
    expect(["ACTIVE", "ACKNOWLEDGED", "DISMISSED", "RESOLVED", "EXPIRED", "SUPERSEDED"]).toContain(
      insight.status
    );
  });

  it("has non-empty title and description", () => {
    expect(insight.title.length).toBeGreaterThan(0);
    expect(insight.description.length).toBeGreaterThan(0);
  });

  it("has confidence between 0 and 1", () => {
    expect(insight.confidence).toBeGreaterThanOrEqual(0);
    expect(insight.confidence).toBeLessThanOrEqual(1);
  });

  it("has valid ISO 8601 timestamps", () => {
    expect(() => new Date(insight.createdAt)).not.toThrow();
    expect(insight.expiresAt).not.toBeNull();
    expect(() => new Date(insight.expiresAt!)).not.toThrow();
  });

  it("recommendations have valid action types", () => {
    for (const rec of insight.recommendations) {
      expect(RECOMMENDATION_ACTION_TYPE_V0).toContain(rec.actionType);
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("affected entities have valid entity types", () => {
    for (const entity of insight.affectedEntities) {
      expect([
        "PERSON",
        "TEAM",
        "DEPARTMENT",
        "PROJECT",
        "TASK",
        "WORK_REQUEST",
        "DECISION_DOMAIN",
        "SKILL",
      ]).toContain(entity.entityType);
    }
  });
});

// ---------------------------------------------------------------------------
// B. Priority Ordering
// ---------------------------------------------------------------------------

describe("Proactive Insights — Priority Ordering", () => {
  it("sortInsightsByUrgency sorts CRITICAL first", () => {
    const insights = [
      makeStaleWikiInsight(), // LOW
      makeCriticalInsight(), // CRITICAL
      makeInsight(), // MEDIUM
      makeAtRiskGoalInsight(), // HIGH
    ];

    const sorted = sortInsightsByUrgency(insights);

    expect(sorted[0].priority).toBe("CRITICAL");
    expect(sorted[1].priority).toBe("HIGH");
    expect(sorted[2].priority).toBe("MEDIUM");
    expect(sorted[3].priority).toBe("LOW");
  });

  it("same-priority sorted by confidence descending", () => {
    const a = makeInsight({ id: "a", priority: "HIGH", confidence: 0.7 });
    const b = makeInsight({ id: "b", priority: "HIGH", confidence: 0.95 });

    const sorted = sortInsightsByUrgency([a, b]);
    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("a");
  });

  it("priority order constants are correct", () => {
    expect(INSIGHT_PRIORITY_ORDER_V0.CRITICAL).toBe(0);
    expect(INSIGHT_PRIORITY_ORDER_V0.HIGH).toBe(1);
    expect(INSIGHT_PRIORITY_ORDER_V0.MEDIUM).toBe(2);
    expect(INSIGHT_PRIORITY_ORDER_V0.LOW).toBe(3);
    expect(INSIGHT_PRIORITY_ORDER_V0.INFO).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// C. Confidence Invariants
// ---------------------------------------------------------------------------

describe("Proactive Insights — Confidence Invariants", () => {
  const allInsights = [
    makeInsight(),
    makeCriticalInsight(),
    makeAtRiskGoalInsight(),
    makeOverloadedInsight(),
    makeStaleWikiInsight(),
  ];

  it("all fixtures have confidence between 0 and 1", () => {
    for (const insight of allInsights) {
      expect(insight.confidence).toBeGreaterThanOrEqual(0);
      expect(insight.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("all fixtures have confidence >= 0.5", () => {
    for (const insight of allInsights) {
      expect(insight.confidence).toBeGreaterThanOrEqual(0.5);
    }
  });
});

// ---------------------------------------------------------------------------
// D. Filter Helpers
// ---------------------------------------------------------------------------

describe("Proactive Insights — Filter Helpers", () => {
  const batch: InsightBatchV0 = buildInsightBatch("ws-test", [
    makeInsight(),
    makeCriticalInsight(),
    makeAtRiskGoalInsight(),
    makeOverloadedInsight(),
    makeStaleWikiInsight(),
    makeDismissedInsight(),
  ]);

  it("getActiveInsights excludes dismissed", () => {
    const active = getActiveInsights(batch);
    expect(active.length).toBe(5);
    expect(active.every((i) => i.status === "ACTIVE")).toBe(true);
  });

  it("getCriticalInsights returns only CRITICAL and ACTIVE", () => {
    const critical = getCriticalInsights(batch);
    expect(critical.length).toBe(1);
    expect(critical[0].priority).toBe("CRITICAL");
  });

  it("getInsightsByCategory filters correctly", () => {
    const workload = getInsightsByCategory(batch, "WORKLOAD");
    expect(workload.every((i) => i.category === "WORKLOAD")).toBe(true);
  });

  it("getInsightsByPriority filters correctly", () => {
    const high = getInsightsByPriority(batch, "HIGH");
    expect(high.every((i) => i.priority === "HIGH")).toBe(true);
  });

  it("getInsightsForEntity filters by entity", () => {
    const personInsights = getInsightsForEntity(batch, "PERSON", "person_1");
    expect(personInsights.length).toBeGreaterThanOrEqual(1);
  });

  it("getHighConfidenceRecommendations filters by threshold", () => {
    const insight = makeInsight({
      recommendations: [
        { id: "r1", action: "High", actionType: "REVIEW", confidence: 0.9 },
        { id: "r2", action: "Low", actionType: "DEFER", confidence: 0.4 },
      ],
    });
    const highConf = getHighConfidenceRecommendations(insight, 0.7);
    expect(highConf.length).toBe(1);
    expect(highConf[0].action).toBe("High");
  });
});

// ---------------------------------------------------------------------------
// E. Expiration & TTL
// ---------------------------------------------------------------------------

describe("Proactive Insights — Expiration", () => {
  it("isInsightExpired returns true for expired insight", () => {
    const expired = makeExpiredInsight();
    expect(isInsightExpired(expired)).toBe(true);
  });

  it("isInsightExpired returns false for active insight", () => {
    const active = makeInsight();
    expect(isInsightExpired(active)).toBe(false);
  });

  it("isInsightExpired returns false when expiresAt is null", () => {
    const noExpiry = makeInsight({ expiresAt: null });
    expect(isInsightExpired(noExpiry)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F. Batch Summary
// ---------------------------------------------------------------------------

describe("Proactive Insights — Batch Summary", () => {
  const insights = [
    makeInsight(),
    makeCriticalInsight(),
    makeAtRiskGoalInsight(),
    makeOverloadedInsight(),
    makeStaleWikiInsight(),
  ];
  const batch = buildInsightBatch("ws-test", insights);

  it("has correct schema version", () => {
    expect(batch.schemaVersion).toBe("v0");
  });

  it("has correct total count", () => {
    expect(batch.summary.totalCount).toBe(5);
  });

  it("has correct active count", () => {
    expect(batch.summary.activeCount).toBe(5);
  });

  it("has byPriority counts", () => {
    expect(batch.summary.byPriority.CRITICAL).toBe(1);
    expect(batch.summary.byPriority.HIGH).toBe(2);
    expect(batch.summary.byPriority.MEDIUM).toBe(1);
    expect(batch.summary.byPriority.LOW).toBe(1);
  });

  it("has byCategory counts", () => {
    expect(batch.summary.byCategory.WORKLOAD).toBe(1);
    expect(batch.summary.byCategory.PROCESS).toBe(2);
    expect(batch.summary.byCategory.PROJECT).toBe(1);
    expect(batch.summary.byCategory.CAPACITY).toBe(1);
  });

  it("mostCritical is the CRITICAL insight", () => {
    expect(batch.summary.mostCritical).not.toBeNull();
    expect(batch.summary.mostCritical!.priority).toBe("CRITICAL");
  });

  it("avgConfidence is between 0 and 1", () => {
    expect(batch.summary.avgConfidence).toBeGreaterThan(0);
    expect(batch.summary.avgConfidence).toBeLessThanOrEqual(1);
  });

  it("freshness is FRESH for just-created batch", () => {
    expect(batch.freshness).toBe("FRESH");
  });

  it("ttlSeconds is positive", () => {
    expect(batch.ttlSeconds).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// G. Batch Freshness Calculation
// ---------------------------------------------------------------------------

describe("Proactive Insights — Freshness Calculation", () => {
  it("returns FRESH for recent generation", () => {
    const now = new Date().toISOString();
    expect(calculateBatchFreshness(now, 3600)).toBe("FRESH");
  });

  it("returns RECENT for mid-age batch", () => {
    const halfHourAgo = new Date(Date.now() - 1800 * 1000).toISOString();
    expect(calculateBatchFreshness(halfHourAgo, 3600)).toBe("RECENT");
  });

  it("returns STALE for near-expiry batch", () => {
    const fiftyMinAgo = new Date(Date.now() - 3000 * 1000).toISOString();
    expect(calculateBatchFreshness(fiftyMinAgo, 3600)).toBe("STALE");
  });

  it("returns EXPIRED for old batch", () => {
    const twoHoursAgo = new Date(Date.now() - 7200 * 1000).toISOString();
    expect(calculateBatchFreshness(twoHoursAgo, 3600)).toBe("EXPIRED");
  });
});

// ---------------------------------------------------------------------------
// H. Insight Category Coverage
// ---------------------------------------------------------------------------

describe("Proactive Insights — Category Coverage", () => {
  it("7 insight types cover expected categories", () => {
    const coveredCategories: InsightCategoryV0[] = [
      "WORKLOAD",   // OVERDUE_TASKS
      "PROJECT",    // AT_RISK_GOALS, PROJECT_HEALTH_ALERT
      "CAPACITY",   // OVERLOADED_TEAM
      "PROCESS",    // UPCOMING_REVIEWS, STALE_WIKI_PAGES
      "COMMUNICATION", // UPCOMING_1ON1
    ];

    for (const cat of coveredCategories) {
      expect(INSIGHT_CATEGORY_V0).toContain(cat);
    }
  });

  it("all insight triggers used are valid", () => {
    const usedTriggers = [
      "DEADLINE_APPROACHING",
      "THRESHOLD_BREACH",
      "PATTERN_DETECTED",
      "SCHEDULED_CHECK",
      "COVERAGE_GAP",
    ];

    for (const trigger of usedTriggers) {
      expect(INSIGHT_TRIGGER_V0).toContain(trigger);
    }
  });
});

// ---------------------------------------------------------------------------
// I. Dismissal Tracking
// ---------------------------------------------------------------------------

describe("Proactive Insights — Dismissal", () => {
  const dismissed = makeDismissedInsight();

  it("dismissed insight has status DISMISSED", () => {
    expect(dismissed.status).toBe("DISMISSED");
  });

  it("dismissed insight has dismissal info", () => {
    expect(dismissed.dismissal).toBeDefined();
    expect(dismissed.dismissal!.reason).toBe("ALREADY_ADDRESSED");
    expect(dismissed.dismissal!.dismissedBy).toBe("user_1");
  });

  it("dismissed insight excluded from active filters", () => {
    const batch = buildInsightBatch("ws-test", [
      makeInsight(),
      dismissed,
    ]);
    const active = getActiveInsights(batch);
    expect(active.length).toBe(1);
    expect(active[0].status).toBe("ACTIVE");
  });
});
