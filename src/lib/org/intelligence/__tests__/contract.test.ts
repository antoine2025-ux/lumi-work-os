/**
 * Contract Tests
 *
 * Ensures consistency between different API endpoints.
 * See docs/org/intelligence-rules.md for canonical rules.
 *
 * These tests verify that ownership data is consistent across:
 * - /api/org/overview
 * - /api/org/ownership
 *
 * Both must return identical unowned counts because they
 * now share the same canonical resolver.
 */

import { describe, it, expect } from "vitest";
import { resolveOwnershipSignals } from "../resolvers/ownership";
import {
  ISSUE_AGGREGATION_THRESHOLD,
  SNAPSHOT_DATA_ASSUMPTIONS,
  ORG_SNAPSHOT_SCHEMA_VERSION,
  ORG_SNAPSHOT_SEMANTICS_VERSION,
  SNAPSHOT_ASSUMPTIONS_ID,
  createSnapshotMeta,
  serializeSnapshot,
  ORG_SNAPSHOT_ISSUE_CODES_SET,
} from "../snapshotTypes";
import type { IntelligenceData } from "../queries";

/**
 * Simulates what Overview API would compute for unownedEntities
 */
function computeOverviewUnownedCount(data: IntelligenceData): number {
  const signals = resolveOwnershipSignals(data);
  return signals.unownedEntities.length;
}

/**
 * Simulates what Ownership API would compute for unowned counts
 */
function computeOwnershipUnownedCount(data: IntelligenceData): number {
  const signals = resolveOwnershipSignals(data);
  return signals.coverage.teams.unowned + signals.coverage.departments.unowned;
}

describe("Overview vs Ownership contract", () => {
  it("Overview API and Ownership API return identical unowned counts", () => {
    const testCases: IntelligenceData[] = [
      // Case 1: All entities owned
      {
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        ],
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        ],
        people: [],
        ownerAssignments: [],
        workspaceOwnerId: "owner-1",
      },
      // Case 2: Some entities unowned
      {
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: null, isActive: true },
          { id: "dept-2", name: "Dept 2", ownerPersonId: "owner-1", isActive: true },
        ],
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
          { id: "team-2", name: "Team 2", departmentId: "dept-2", ownerPersonId: "owner-1", isActive: true },
        ],
        people: [],
        ownerAssignments: [],
        workspaceOwnerId: "owner-1",
      },
      // Case 3: Unassigned teams excluded
      {
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        ],
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
          { id: "team-2", name: "Unassigned", departmentId: null, ownerPersonId: null, isActive: true },
        ],
        people: [],
        ownerAssignments: [],
        workspaceOwnerId: "owner-1",
      },
      // Case 4: Mixed ownership sources
      {
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-A", isActive: true },
        ],
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
        people: [],
        ownerAssignments: [
          { entityType: "TEAM", entityId: "team-1", ownerPersonId: "owner-B" },
        ],
        workspaceOwnerId: "owner-1",
      },
    ];

    for (const data of testCases) {
      const overviewCount = computeOverviewUnownedCount(data);
      const ownershipCount = computeOwnershipUnownedCount(data);

      expect(overviewCount).toBe(ownershipCount);
    }
  });

  it("unownedEntities.length equals coverage.teams.unowned + coverage.departments.unowned", () => {
    const data: IntelligenceData = {
      departments: [
        { id: "dept-1", name: "Unowned Dept", ownerPersonId: null, isActive: true },
        { id: "dept-2", name: "Owned Dept", ownerPersonId: "owner-1", isActive: true },
      ],
      teams: [
        { id: "team-1", name: "Unowned Team", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        { id: "team-2", name: "Owned Team", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        { id: "team-3", name: "Another Unowned", departmentId: "dept-2", ownerPersonId: null, isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // unownedEntities should have: dept-1, team-1, team-3
    expect(signals.unownedEntities).toHaveLength(3);

    // coverage.unowned totals should match
    const totalUnowned = signals.coverage.teams.unowned + signals.coverage.departments.unowned;
    expect(totalUnowned).toBe(signals.unownedEntities.length);
  });
});

describe("Aggregation does not change unownedEntities", () => {
  /**
   * CRITICAL CONTRACT: Overview/drilldowns must use unownedEntities.length,
   * NOT issues.length, because issues may be aggregated.
   */

  it("unownedEntities.length is unchanged by aggregation", () => {
    // Create enough entities to trigger aggregation
    const teamCount = ISSUE_AGGREGATION_THRESHOLD + 5;
    const teams = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i}`,
      name: `Team ${i}`,
      departmentId: "dept-1",
      ownerPersonId: null, // All unowned
      isActive: true,
    }));

    const data: IntelligenceData = {
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      teams,
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Issues are aggregated (single summary issue)
    const unownedTeamIssues = signals.issues.filter((i) => i.code === "OWNERSHIP_UNOWNED_TEAM");
    expect(unownedTeamIssues.length).toBe(1); // Aggregated to 1

    // But unownedEntities has ALL entities
    expect(signals.unownedEntities.length).toBe(teamCount);

    // And coverage.unowned is correct
    expect(signals.coverage.teams.unowned).toBe(teamCount);
  });

  it("Overview must derive count from unownedEntities, not issues", () => {
    // Simulate what Overview API should do
    const teamCount = 20;
    const teams = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i}`,
      name: `Team ${i}`,
      departmentId: "dept-1",
      ownerPersonId: null,
      isActive: true,
    }));

    const data: IntelligenceData = {
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      teams,
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // CORRECT: Use unownedEntities.length
    const correctCount = signals.unownedEntities.length;
    expect(correctCount).toBe(teamCount);

    // WRONG: Using issues.length would give 1 (aggregated)
    const wrongCount = signals.issues.filter((i) => i.code === "OWNERSHIP_UNOWNED_TEAM").length;
    expect(wrongCount).toBe(1); // This is wrong for drilldowns!

    // Contract: correctCount !== wrongCount when aggregated
    expect(correctCount).not.toBe(wrongCount);
  });

  it("issues.entities preview count does not equal total unowned", () => {
    const teamCount = 15;
    const teams = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i}`,
      name: `Team ${i}`,
      departmentId: "dept-1",
      ownerPersonId: null,
      isActive: true,
    }));

    const data: IntelligenceData = {
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      teams,
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    const aggregatedIssue = signals.issues.find((i) => i.code === "OWNERSHIP_UNOWNED_TEAM");
    expect(aggregatedIssue).toBeDefined();

    // entities in issue is preview only (limited count)
    expect(aggregatedIssue?.entities?.length).toBeLessThan(teamCount);

    // But unownedEntities has all
    expect(signals.unownedEntities.length).toBe(teamCount);

    // meta.count has the true count
    expect(aggregatedIssue?.meta?.count).toBe(teamCount);
  });
});

describe("_meta stability guarantees", () => {
  it("dataAssumptions equals SNAPSHOT_DATA_ASSUMPTIONS exactly", () => {
    const meta = createSnapshotMeta();

    // Must equal exactly, not just "contain"
    expect(meta.dataAssumptions).toEqual(SNAPSHOT_DATA_ASSUMPTIONS);

    // Ordering must be stable
    expect([...meta.dataAssumptions]).toEqual([...SNAPSHOT_DATA_ASSUMPTIONS]);
  });

  it("schemaVersion equals ORG_SNAPSHOT_SCHEMA_VERSION", () => {
    const meta = createSnapshotMeta();
    expect(meta.schemaVersion).toBe(ORG_SNAPSHOT_SCHEMA_VERSION);
  });

  it("semanticsVersion equals ORG_SNAPSHOT_SEMANTICS_VERSION", () => {
    const meta = createSnapshotMeta();
    expect(meta.semanticsVersion).toBe(ORG_SNAPSHOT_SEMANTICS_VERSION);
  });

  it("assumptionsId equals SNAPSHOT_ASSUMPTIONS_ID", () => {
    const meta = createSnapshotMeta();
    expect(meta.assumptionsId).toBe(SNAPSHOT_ASSUMPTIONS_ID);
  });

  it("serialized snapshot preserves _meta fields exactly", () => {
    // Create a minimal snapshot for serialization test
    const snapshot = {
      structure: undefined,
      ownership: undefined,
      people: undefined,
      capacity: undefined,
      _meta: createSnapshotMeta(),
    };

    const serialized = serializeSnapshot(snapshot as any);

    // Verify all _meta fields are present and correct
    expect(serialized._meta.schemaVersion).toBe(ORG_SNAPSHOT_SCHEMA_VERSION);
    expect(serialized._meta.semanticsVersion).toBe(ORG_SNAPSHOT_SEMANTICS_VERSION);
    expect(serialized._meta.assumptionsId).toBe(SNAPSHOT_ASSUMPTIONS_ID);
    expect(serialized._meta.dataAssumptions).toEqual(SNAPSHOT_DATA_ASSUMPTIONS);

    // computedAt is serialized to ISO string
    expect(typeof serialized._meta.computedAt).toBe("string");
    expect(serialized._meta.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe("issue code type safety", () => {
  it("all issue codes are in ORG_SNAPSHOT_ISSUE_CODES", () => {
    // Create data that triggers multiple issue types
    const data: IntelligenceData = {
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: null, isActive: true },
        { id: "dept-2", name: "", ownerPersonId: "owner-1", isActive: true }, // Missing name
      ],
      teams: [
        { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-A", isActive: true },
        { id: "team-2", name: "Team 2", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        { id: "team-3", name: "Unassigned", departmentId: null, ownerPersonId: null, isActive: true },
      ],
      people: [],
      ownerAssignments: [
        { entityType: "TEAM", entityId: "team-1", ownerPersonId: "owner-B" }, // Conflict
        { entityType: "INVALID", entityId: "x", ownerPersonId: "y" }, // Unknown type
      ],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Every emitted issue code must be in the allowlist
    for (const issue of signals.issues) {
      expect(
        ORG_SNAPSHOT_ISSUE_CODES_SET.has(issue.code),
        `Issue code "${issue.code}" is not in ORG_SNAPSHOT_ISSUE_CODES`
      ).toBe(true);
    }
  });
});

describe("Coverage Universe Invariant", () => {
  /**
   * CRITICAL INVARIANT:
   * unownedEntities.length === coverage.teams.unowned + coverage.departments.unowned
   *
   * This holds because:
   * 1. unownedEntities only includes entities in coverage universe
   * 2. Unassigned teams are in unassignedTeamsExcludedFromCoverage, NOT in unownedEntities
   */

  it("unassigned teams do NOT appear in unownedEntities", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Assigned Owned", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        { id: "team-2", name: "Assigned Unowned", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        { id: "team-3", name: "Unassigned Unowned", departmentId: null, ownerPersonId: null, isActive: true },
        { id: "team-4", name: "Unassigned With Owner", departmentId: null, ownerPersonId: "owner-1", isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Unassigned teams (team-3, team-4) should NOT be in unownedEntities
    const unownedTeamIds = signals.unownedEntities
      .filter((e) => e.type === "team")
      .map((e) => e.id);

    expect(unownedTeamIds).not.toContain("team-3"); // Unassigned
    expect(unownedTeamIds).not.toContain("team-4"); // Unassigned

    // Only assigned unowned team should be in unownedEntities
    expect(unownedTeamIds).toContain("team-2");
    expect(unownedTeamIds).toHaveLength(1);
  });

  it("unassigned teams appear ONLY in unassignedTeamsExcludedFromCoverage", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Assigned", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        { id: "team-2", name: "Unassigned A", departmentId: null, ownerPersonId: null, isActive: true },
        { id: "team-3", name: "Unassigned B", departmentId: null, ownerPersonId: "owner-1", isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Unassigned teams should be in unassignedTeamsExcludedFromCoverage
    const excludedIds = signals.unassignedTeamsExcludedFromCoverage.map((e) => e.id);
    expect(excludedIds).toContain("team-2");
    expect(excludedIds).toContain("team-3");
    expect(excludedIds).toHaveLength(2);

    // Assigned team should NOT be in excluded list
    expect(excludedIds).not.toContain("team-1");
  });

  it("coverage.teams.total excludes unassigned teams", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Assigned 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        { id: "team-2", name: "Assigned 2", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        { id: "team-3", name: "Unassigned", departmentId: null, ownerPersonId: null, isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Total should be 2 (assigned teams only), not 3
    expect(signals.coverage.teams.total).toBe(2);
    expect(signals.coverage.teams.total).not.toBe(data.teams.length);
  });

  it("unownedEntities.length === coverage.teams.unowned + coverage.departments.unowned (INVARIANT)", () => {
    const testCases: IntelligenceData[] = [
      // Case 1: No unassigned teams
      {
        teams: [
          { id: "team-1", name: "T1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
          { id: "team-2", name: "T2", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "D1", ownerPersonId: null, isActive: true },
        ],
        people: [],
        ownerAssignments: [],
        workspaceOwnerId: "owner-1",
      },
      // Case 2: With unassigned teams (should be excluded from both sides)
      {
        teams: [
          { id: "team-1", name: "T1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
          { id: "team-2", name: "T2", departmentId: null, ownerPersonId: null, isActive: true }, // Unassigned
        ],
        departments: [
          { id: "dept-1", name: "D1", ownerPersonId: null, isActive: true },
        ],
        people: [],
        ownerAssignments: [],
        workspaceOwnerId: "owner-1",
      },
      // Case 3: All owned
      {
        teams: [
          { id: "team-1", name: "T1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "D1", ownerPersonId: "owner-1", isActive: true },
        ],
        people: [],
        ownerAssignments: [],
        workspaceOwnerId: "owner-1",
      },
      // Case 4: All unowned
      {
        teams: [
          { id: "team-1", name: "T1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
          { id: "team-2", name: "T2", departmentId: "dept-2", ownerPersonId: null, isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "D1", ownerPersonId: null, isActive: true },
          { id: "dept-2", name: "D2", ownerPersonId: null, isActive: true },
        ],
        people: [],
        ownerAssignments: [],
        workspaceOwnerId: "owner-1",
      },
    ];

    for (const data of testCases) {
      const signals = resolveOwnershipSignals(data);

      const unownedCount = signals.unownedEntities.length;
      const coverageUnowned =
        signals.coverage.teams.unowned + signals.coverage.departments.unowned;

      // INVARIANT: These must always be equal
      expect(unownedCount).toBe(coverageUnowned);
    }
  });

  it("invariant holds even with ownership conflicts", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Conflict", departmentId: "dept-1", ownerPersonId: "owner-A", isActive: true },
        { id: "team-2", name: "Unowned", departmentId: "dept-1", ownerPersonId: null, isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "D1", ownerPersonId: "owner-1", isActive: true },
      ],
      people: [],
      ownerAssignments: [
        { entityType: "TEAM", entityId: "team-1", ownerPersonId: "owner-B" }, // Conflict
      ],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // team-1 has conflict but IS owned (uses ownerAssignment)
    // team-2 is unowned
    // dept-1 is owned

    expect(signals.unownedEntities.length).toBe(1); // Only team-2
    expect(signals.coverage.teams.unowned).toBe(1);
    expect(signals.coverage.departments.unowned).toBe(0);

    // Invariant holds
    expect(signals.unownedEntities.length).toBe(
      signals.coverage.teams.unowned + signals.coverage.departments.unowned
    );
  });
});
