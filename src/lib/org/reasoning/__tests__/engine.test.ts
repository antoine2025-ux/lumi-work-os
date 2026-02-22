/**
 * Engine Tests
 *
 * Tests for computeOrgRecommendations pure function.
 *
 * GUARANTEES TESTED:
 * - Determinism: same input → same output (excluding computedAt)
 * - Determinism with shuffled input: shuffled arrays still produce same order
 * - Aggregation: one recommendation per topic, not N per entity
 * - Evidence: each recommendation has issueCodes or entities
 * - Action validation: rejects invalid hrefs
 * - Critical action requirement: critical recs must have primary action
 */

import { describe, it, expect } from "vitest";
import type { OrgIntelligenceSnapshotDTO } from "../../intelligence/snapshotTypes";
import { computeOrgRecommendations } from "../engine";
import { createRecommendation, validateAction, buildEvidence } from "../helpers";
import type { RecommendationAction, InputSnapshotMeta } from "../types";
import { ORG_RECOMMENDATION_CODES_SET } from "../types";
import {
  ORG_REASONING_SCHEMA_VERSION,
  ORG_REASONING_SEMANTICS_VERSION,
  REASONING_MAX_LIMIT,
} from "../version";

// ============================================================================
// Test Data
// ============================================================================

const mockSnapshotMeta: InputSnapshotMeta = {
  schemaVersion: 1,
  semanticsVersion: 1,
  assumptionsId: "org-snapshot:v1",
};

function createMockSnapshot(
  overrides: Partial<OrgIntelligenceSnapshotDTO> = {}
): OrgIntelligenceSnapshotDTO {
  return {
    ownership: {
      coverage: {
        teams: { total: 5, owned: 2, unowned: 3, percent: 40 },
        departments: { total: 2, owned: 1, unowned: 1, percent: 50 },
        overallPercent: 42,
      },
      unownedEntities: [
        { type: "team", id: "team-1", name: "Team 1" },
        { type: "team", id: "team-2", name: "Team 2" },
        { type: "team", id: "team-3", name: "Team 3" },
        { type: "department", id: "dept-1", name: "Dept 1" },
      ],
      unassignedTeamsExcludedFromCoverage: [],
      conflicts: [
        { type: "team", id: "team-conflict", name: "Conflicted Team" },
      ],
      ownershipByEntity: {},
      issues: [
        { code: "OWNERSHIP_UNOWNED_TEAM", severity: "warning", title: "Test" },
      ],
    },
    structure: {
      departments: [],
      teamsByDepartment: {},
      unassignedTeams: [
        { type: "team", id: "team-unassigned", name: "Unassigned Team" },
      ],
      departmentsWithoutTeams: [
        { type: "department", id: "dept-empty", name: "Empty Dept" },
      ],
      teamsWithoutPeople: [],
      peopleWithoutTeams: [],
      issues: [],
    },
    people: {
      peopleWithoutManagers: [
        { type: "person", id: "person-1", name: "Person 1" },
        { type: "person", id: "person-2", name: "Person 2" },
      ],
      managerLoad: [
        { manager: { type: "person", id: "mgr-1", name: "Manager 1" }, directReports: 15 },
      ],
      overloadedManagers: [
        { manager: { type: "person", id: "mgr-1", name: "Manager 1" }, directReports: 15 },
      ],
      issues: [],
    },
    capacity: {
      roleDistribution: [],
      teamsWithZeroExecutionCapacity: [],
      issues: [
        { code: "CAPACITY_NOT_MODELED", severity: "info", title: "Capacity not modeled" },
      ],
    },
    _meta: {
      computedAt: "2026-01-24T10:00:00.000Z",
      schemaVersion: 1,
      semanticsVersion: 1,
      assumptionsId: "org-snapshot:v1",
      dataAssumptions: ["workspaceIdFromAuthOnly"],
    },
    ...overrides,
  };
}

// ============================================================================
// Determinism Tests
// ============================================================================

describe("computeOrgRecommendations: Determinism", () => {
  it("produces same output for same input (excluding computedAt)", () => {
    const snapshot = createMockSnapshot();

    const result1 = computeOrgRecommendations(snapshot);
    const result2 = computeOrgRecommendations(snapshot);

    // Remove computedAt for comparison
    const { _meta: meta1, ...rest1 } = result1;
    const { _meta: meta2, ...rest2 } = result2;
    const { ...metaRest1 } = meta1;
    const { ...metaRest2 } = meta2;

    expect(rest1).toEqual(rest2);
    expect(metaRest1).toEqual(metaRest2);
  });

  it("produces same order with shuffled unownedEntities", () => {
    const base = createMockSnapshot();
    const shuffled = createMockSnapshot();

    // Shuffle unownedEntities
    if (shuffled.ownership) {
      shuffled.ownership.unownedEntities = [
        ...shuffled.ownership.unownedEntities,
      ].reverse();
    }

    const result1 = computeOrgRecommendations(base);
    const result2 = computeOrgRecommendations(shuffled);

    // Order of recommendation codes should be identical
    const codes1 = result1.recommendations.map((r) => r.code);
    const codes2 = result2.recommendations.map((r) => r.code);

    expect(codes1).toEqual(codes2);
  });

  it("produces consistent ranking across calls", () => {
    const snapshot = createMockSnapshot();

    const results = Array.from({ length: 5 }, () =>
      computeOrgRecommendations(snapshot)
    );

    const firstOrder = results[0].recommendations.map((r) => r.code);
    for (const result of results) {
      expect(result.recommendations.map((r) => r.code)).toEqual(firstOrder);
    }
  });
});

// ============================================================================
// Aggregation Tests
// ============================================================================

describe("computeOrgRecommendations: Aggregation Invariant", () => {
  it("returns one REC_ASSIGN_TEAM_OWNER for multiple unowned teams", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 50 });

    const teamOwnerRecs = result.recommendations.filter(
      (r) => r.code === "REC_ASSIGN_TEAM_OWNER"
    );

    // Should be exactly 1 recommendation, not N
    expect(teamOwnerRecs.length).toBe(1);

    // Should have count in evidence meta
    const rec = teamOwnerRecs[0];
    expect(rec.evidence.meta.count).toBe(3); // 3 unowned teams
  });

  it("returns one REC_ASSIGN_DEPT_OWNER for multiple unowned departments", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 50 });

    const deptOwnerRecs = result.recommendations.filter(
      (r) => r.code === "REC_ASSIGN_DEPT_OWNER"
    );

    expect(deptOwnerRecs.length).toBe(1);
    expect(deptOwnerRecs[0].evidence.meta.count).toBe(1);
  });

  it("returns one REC_FIX_MANAGER_GAPS for multiple people without managers", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 50 });

    const managerGapRecs = result.recommendations.filter(
      (r) => r.code === "REC_FIX_MANAGER_GAPS"
    );

    expect(managerGapRecs.length).toBe(1);
    expect(managerGapRecs[0].evidence.meta.count).toBe(2);
  });
});

// ============================================================================
// Evidence Tests
// ============================================================================

describe("computeOrgRecommendations: Evidence Contract", () => {
  it("every recommendation has issueCodes or entities", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 50 });

    for (const rec of result.recommendations) {
      const hasIssueCodes = rec.evidence.issueCodes.length > 0;
      const hasEntities = rec.evidence.entities.length > 0;

      expect(hasIssueCodes || hasEntities).toBe(true);
    }
  });

  it("evidence includes snapshotMeta for traceability", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 50 });

    for (const rec of result.recommendations) {
      expect(rec.evidence.meta.snapshotMeta).toBeDefined();
      expect(rec.evidence.meta.snapshotMeta.schemaVersion).toBe(1);
      expect(rec.evidence.meta.snapshotMeta.semanticsVersion).toBe(1);
      expect(rec.evidence.meta.snapshotMeta.assumptionsId).toBe("org-snapshot:v1");
    }
  });
});

// ============================================================================
// Limit Tests
// ============================================================================

describe("computeOrgRecommendations: Limit Behavior", () => {
  it("returns empty array when limit=0", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 0 });

    expect(result.recommendations.length).toBe(0);
  });

  it("clamps limit to max (50)", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 100 });

    // Should not exceed max
    expect(result.recommendations.length).toBeLessThanOrEqual(REASONING_MAX_LIMIT);
  });

  it("summaries reflect full count, not limited count", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 1 });

    // Summaries should count all recommendations
    expect(result.summaries.total).toBeGreaterThan(result.recommendations.length);
  });
});

// ============================================================================
// Meta Tests
// ============================================================================

describe("computeOrgRecommendations: Meta", () => {
  it("includes correct version constants", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot);

    expect(result._meta.reasoningSchemaVersion).toBe(ORG_REASONING_SCHEMA_VERSION);
    expect(result._meta.reasoningSemanticsVersion).toBe(ORG_REASONING_SEMANTICS_VERSION);
    expect(result._meta.snapshotApiVersion).toBe("v2");
  });

  it("includes inputSnapshotMeta from input snapshot", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot);

    expect(result._meta.inputSnapshotMeta).toEqual({
      schemaVersion: snapshot._meta.schemaVersion,
      semanticsVersion: snapshot._meta.semanticsVersion,
      assumptionsId: snapshot._meta.assumptionsId,
    });
  });

  it("computedAt is valid ISO timestamp", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot);

    const date = new Date(result._meta.computedAt);
    expect(date.toISOString()).toBe(result._meta.computedAt);
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("validateAction", () => {
  it("accepts valid allowed paths with matching surfaces", () => {
    // Each href must match its corresponding surface
    const validCases: Array<{ href: string; surface: RecommendationAction["surface"] }> = [
      { href: "/org/ownership", surface: "ownership" },
      { href: "/org/people", surface: "people" },
      { href: "/org/structure", surface: "structure" },
      { href: "/org/teams/team-123", surface: "team" },
      { href: "/org/departments/dept-456", surface: "department" },
    ];

    for (const { href, surface } of validCases) {
      const action: RecommendationAction = {
        label: "Test",
        href,
        surface,
      };
      expect(() => validateAction(action)).not.toThrow();
    }
  });

  it("rejects empty href", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/empty/i);
  });

  it("rejects href with leading whitespace", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: " /org/structure",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/whitespace/i);
  });

  it("rejects href with trailing whitespace", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/structure ",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/whitespace/i);
  });

  it("rejects href with newline", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/structure\njavascript:alert(1)",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/control characters/i);
  });

  it("rejects href with carriage return", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/structure\rmalicious",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/control characters/i);
  });

  it("rejects href with tab", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/structure\tmalicious",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/control characters/i);
  });

  it("rejects paths not in allowed prefixes", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/settings",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/must start with one of/i);
  });

  it("rejects http:// URLs", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "http://example.com",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/must start with one of/i);
  });

  it("rejects https:// URLs", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "https://example.com",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/must start with one of/i);
  });

  it("rejects javascript: URLs", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "javascript:alert(1)",
      surface: "structure",
    };

    expect(() => validateAction(action)).toThrow(/must start with one of/i);
  });

  it("rejects surface ↔ href mismatch (ownership surface → structure href)", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/structure",
      surface: "ownership",
    };

    expect(() => validateAction(action)).toThrow(/ownership.*must link to/i);
  });

  it("rejects surface ↔ href mismatch (people surface → ownership href)", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/ownership",
      surface: "people",
    };

    expect(() => validateAction(action)).toThrow(/people.*must link to/i);
  });

  it("accepts matching surface and href (ownership → /org/ownership)", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/ownership",
      surface: "ownership",
    };

    expect(() => validateAction(action)).not.toThrow();
  });

  it("accepts matching surface and href (team → /org/teams/xxx)", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/teams/team-123",
      surface: "team",
    };

    expect(() => validateAction(action)).not.toThrow();
  });

  it("accepts matching surface and href (department → /org/departments/xxx)", () => {
    const action: RecommendationAction = {
      label: "Test",
      href: "/org/departments/dept-456",
      surface: "department",
    };

    expect(() => validateAction(action)).not.toThrow();
  });
});

describe("createRecommendation", () => {
  it("throws when evidence has no issueCodes or entities", () => {
    expect(() =>
      createRecommendation("REC_ASSIGN_TEAM_OWNER", "critical", "Test", {
        category: "ownership",
        summary: "Test summary",
        evidence: {
          issueCodes: [],
          entities: [],
          meta: { snapshotMeta: mockSnapshotMeta },
        },
        actions: [
          { label: "Fix", href: "/org/ownership", surface: "ownership", primary: true },
        ],
        rank: 1,
      })
    ).toThrow(/must have evidence/i);
  });

  it("throws when critical rec has no actions", () => {
    expect(() =>
      createRecommendation("REC_ASSIGN_TEAM_OWNER", "critical", "Test", {
        category: "ownership",
        summary: "Test summary",
        evidence: {
          issueCodes: ["OWNERSHIP_UNOWNED_TEAM"],
          entities: [],
          meta: { snapshotMeta: mockSnapshotMeta },
        },
        actions: [],
        rank: 1,
      })
    ).toThrow(/must have at least one action/i);
  });

  it("throws when warning rec has no actions", () => {
    expect(() =>
      createRecommendation("REC_RESOLVE_OWNERSHIP_CONFLICTS", "warning", "Test", {
        category: "ownership",
        summary: "Test summary",
        evidence: {
          issueCodes: ["OWNERSHIP_CONFLICT_TEAM"],
          entities: [],
          meta: { snapshotMeta: mockSnapshotMeta },
        },
        actions: [],
        rank: 1,
      })
    ).toThrow(/must have at least one action/i);
  });

  it("allows info rec with no actions", () => {
    const rec = createRecommendation("REC_ENABLE_CAPACITY_MODELING", "info", "Test", {
      category: "capacity",
      summary: "Test summary",
      evidence: {
        issueCodes: ["CAPACITY_NOT_MODELED"],
        entities: [],
        meta: { snapshotMeta: mockSnapshotMeta },
      },
      actions: [],
      rank: 1,
    });

    expect(rec.actions).toHaveLength(0);
  });

  it("throws when critical rec has no primary action", () => {
    expect(() =>
      createRecommendation("REC_ASSIGN_TEAM_OWNER", "critical", "Test", {
        category: "ownership",
        summary: "Test summary",
        evidence: {
          issueCodes: ["OWNERSHIP_UNOWNED_TEAM"],
          entities: [],
          meta: { snapshotMeta: mockSnapshotMeta },
        },
        actions: [
          { label: "Fix", href: "/org/ownership", surface: "ownership" }, // No primary
        ],
        rank: 1,
      })
    ).toThrow(/primary action/i);
  });

  it("creates valid recommendation when all constraints met", () => {
    const rec = createRecommendation("REC_ASSIGN_TEAM_OWNER", "critical", "Test", {
      category: "ownership",
      summary: "Test summary",
      evidence: {
        issueCodes: ["OWNERSHIP_UNOWNED_TEAM"],
        entities: [],
        meta: { snapshotMeta: mockSnapshotMeta },
      },
      actions: [
        { label: "Fix", href: "/org/ownership", surface: "ownership", primary: true },
      ],
      rank: 1,
    });

    expect(rec.code).toBe("REC_ASSIGN_TEAM_OWNER");
    expect(rec.severity).toBe("critical");
  });
});

describe("buildEvidence", () => {
  it("limits entities to preview count", () => {
    const entities = Array.from({ length: 10 }, (_, i) => ({
      type: "team" as const,
      id: `team-${i}`,
      name: `Team ${i}`,
    }));

    const evidence = buildEvidence(["OWNERSHIP_UNOWNED_TEAM"], entities, mockSnapshotMeta);

    expect(evidence.entities.length).toBe(3); // REASONING_PREVIEW_COUNT
    expect(evidence.meta.count).toBe(10); // Full count
  });

  it("includes snapshotMeta", () => {
    const evidence = buildEvidence(
      ["OWNERSHIP_UNOWNED_TEAM"],
      [],
      mockSnapshotMeta
    );

    expect(evidence.meta.snapshotMeta).toEqual(mockSnapshotMeta);
  });

  it("de-duplicates issue codes", () => {
    const evidence = buildEvidence(
      ["OWNERSHIP_UNOWNED_TEAM", "OWNERSHIP_UNOWNED_TEAM", "OWNERSHIP_CONFLICT_TEAM"],
      [],
      mockSnapshotMeta
    );

    expect(evidence.issueCodes).toHaveLength(2);
    // Should be sorted for determinism
    expect(evidence.issueCodes).toEqual(["OWNERSHIP_CONFLICT_TEAM", "OWNERSHIP_UNOWNED_TEAM"]);
  });

  it("de-duplicates entities by type:id", () => {
    const entities = [
      { type: "team" as const, id: "team-1", name: "Team 1" },
      { type: "team" as const, id: "team-1", name: "Team 1 Duplicate" },
      { type: "team" as const, id: "team-2", name: "Team 2" },
    ];

    const evidence = buildEvidence(["OWNERSHIP_UNOWNED_TEAM"], entities, mockSnapshotMeta);

    expect(evidence.entities).toHaveLength(2);
    expect(evidence.meta.count).toBe(2); // Unique count
  });

  it("sets aggregated and previewCount correctly", () => {
    const entities = Array.from({ length: 10 }, (_, i) => ({
      type: "team" as const,
      id: `team-${i}`,
      name: `Team ${i}`,
    }));

    const evidence = buildEvidence(["OWNERSHIP_UNOWNED_TEAM"], entities, mockSnapshotMeta);

    expect(evidence.meta.aggregated).toBe(true);
    expect(evidence.meta.previewCount).toBe(3);
    expect(evidence.meta.count).toBe(10);
  });

  it("sets aggregated false when count <= preview", () => {
    const entities = [
      { type: "team" as const, id: "team-1", name: "Team 1" },
    ];

    const evidence = buildEvidence(["OWNERSHIP_UNOWNED_TEAM"], entities, mockSnapshotMeta);

    expect(evidence.meta.aggregated).toBe(false);
    expect(evidence.meta.previewCount).toBe(1);
    expect(evidence.meta.count).toBe(1);
  });

  it("supports totalCountOverride", () => {
    const previewEntities = [
      { type: "team" as const, id: "team-1", name: "Team 1" },
      { type: "team" as const, id: "team-2", name: "Team 2" },
    ];

    // We pass only 2 entities but the actual count is 100
    const evidence = buildEvidence(
      ["OWNERSHIP_UNOWNED_TEAM"],
      previewEntities,
      mockSnapshotMeta,
      { totalCountOverride: 100 }
    );

    expect(evidence.entities).toHaveLength(2);
    expect(evidence.meta.count).toBe(100);
    expect(evidence.meta.previewCount).toBe(2);
    expect(evidence.meta.aggregated).toBe(true);
  });
});

// ============================================================================
// Code Validation Tests
// ============================================================================

describe("computeOrgRecommendations: Code Validation", () => {
  it("all emitted codes are from ORG_RECOMMENDATION_CODES", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 50 });

    for (const rec of result.recommendations) {
      expect(ORG_RECOMMENDATION_CODES_SET.has(rec.code)).toBe(true);
    }
  });

  it("emits each code at most once (aggregation invariant)", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 50 });

    const seenCodes = new Set<string>();
    for (const rec of result.recommendations) {
      expect(seenCodes.has(rec.code)).toBe(false);
      seenCodes.add(rec.code);
    }
  });
});

// ============================================================================
// Sorting Tests
// ============================================================================

describe("computeOrgRecommendations: Sorting", () => {
  it("sorts by severity (critical > warning > info)", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 50 });

    const severityOrder = result.recommendations.map((r) => r.severity);

    // Find indices of each severity level
    const criticalIndices = severityOrder
      .map((s, i) => (s === "critical" ? i : -1))
      .filter((i) => i >= 0);
    const warningIndices = severityOrder
      .map((s, i) => (s === "warning" ? i : -1))
      .filter((i) => i >= 0);
    const infoIndices = severityOrder
      .map((s, i) => (s === "info" ? i : -1))
      .filter((i) => i >= 0);

    // All critical should come before all warning
    if (criticalIndices.length > 0 && warningIndices.length > 0) {
      const maxCritical = Math.max(...criticalIndices);
      const minWarning = Math.min(...warningIndices);
      expect(maxCritical).toBeLessThan(minWarning);
    }

    // All warning should come before all info
    if (warningIndices.length > 0 && infoIndices.length > 0) {
      const maxWarning = Math.max(...warningIndices);
      const minInfo = Math.min(...infoIndices);
      expect(maxWarning).toBeLessThan(minInfo);
    }
  });

  it("sorts by category within severity", () => {
    const snapshot = createMockSnapshot();

    const result = computeOrgRecommendations(snapshot, { limit: 50 });

    // Within critical, ownership should come before people
    const criticalRecs = result.recommendations.filter(
      (r) => r.severity === "critical"
    );
    const ownershipIndex = criticalRecs.findIndex(
      (r) => r.category === "ownership"
    );
    const peopleIndex = criticalRecs.findIndex((r) => r.category === "people");

    if (ownershipIndex >= 0 && peopleIndex >= 0) {
      expect(ownershipIndex).toBeLessThan(peopleIndex);
    }
  });
});
