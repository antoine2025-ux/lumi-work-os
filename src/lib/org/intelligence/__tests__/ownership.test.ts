/**
 * Ownership Resolver Tests
 *
 * Tests canonical ownership rules from docs/org/intelligence-rules.md:
 * - OwnerAssignment is authoritative source
 * - entity.ownerPersonId is fallback
 * - Unassigned teams (departmentId = null) excluded from coverage
 * - OWNERSHIP_CONFLICT_TEAM/DEPARTMENT emitted when both sources differ
 * - Coverage uses Math.floor for conservative reporting
 * - Issue aggregation when count > threshold
 */

import { describe, it, expect } from "vitest";
import { resolveOwnershipSignals } from "../resolvers/ownership";
import {
  createEntityRef,
  createEntityKey,
  normalizeEntityTypeFromDB,
  ISSUE_AGGREGATION_THRESHOLD,
  ISSUE_PREVIEW_COUNT,
  ORG_SNAPSHOT_ISSUE_CODES_SET,
} from "../snapshotTypes";
import type { IntelligenceData } from "../queries";

function createMockData(overrides: Partial<IntelligenceData> = {}): IntelligenceData {
  return {
    departments: [],
    teams: [],
    people: [],
    ownerAssignments: [],
    workspaceOwnerId: "workspace-owner-1",
    ...overrides,
  };
}

describe("resolveOwnershipSignals", () => {
  describe("team ownership", () => {
    it("team owned via ownerAssignment counts as owned", () => {
      const data = createMockData({
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        ],
        ownerAssignments: [
          { entityType: "TEAM", entityId: "team-1", ownerPersonId: "owner-1" },
        ],
      });

      const signals = resolveOwnershipSignals(data);

      expect(signals.coverage.teams.owned).toBe(1);
      expect(signals.coverage.teams.unowned).toBe(0);
      expect(signals.unownedEntities).toHaveLength(0);

      // Check per-entity state
      expect(signals.ownershipByEntity["team:team-1"]).toMatchObject({
        ownerId: "owner-1",
        source: "ownerAssignment",
        hasConflict: false,
      });
    });

    it("team owned via team.ownerPersonId counts as owned (fallback)", () => {
      const data = createMockData({
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        ],
        ownerAssignments: [],
      });

      const signals = resolveOwnershipSignals(data);

      expect(signals.coverage.teams.owned).toBe(1);
      expect(signals.coverage.teams.unowned).toBe(0);
      expect(signals.ownershipByEntity["team:team-1"]).toMatchObject({
        source: "ownerPersonId",
      });
    });

    it("team without owner is flagged as unowned", () => {
      const data = createMockData({
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        ],
        ownerAssignments: [],
      });

      const signals = resolveOwnershipSignals(data);

      expect(signals.coverage.teams.unowned).toBe(1);
      expect(signals.unownedEntities).toHaveLength(1);
      expect(signals.unownedEntities[0]).toMatchObject({
        type: "team",
        id: "team-1",
        name: "Team 1",
      });
      expect(signals.issues.some((i) => i.code === "OWNERSHIP_UNOWNED_TEAM")).toBe(true);
    });
  });

  describe("unassigned teams", () => {
    it("unassigned teams (departmentId = null) excluded from coverage totals", () => {
      const data = createMockData({
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
          { id: "team-2", name: "Unassigned Team", departmentId: null, ownerPersonId: null, isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        ],
        ownerAssignments: [],
      });

      const signals = resolveOwnershipSignals(data);

      // Only team-1 should be in coverage (team-2 is unassigned)
      expect(signals.coverage.teams.total).toBe(1);
      expect(signals.coverage.teams.owned).toBe(1);
      expect(signals.unassignedTeamsExcludedFromCoverage).toHaveLength(1);
      expect(signals.unassignedTeamsExcludedFromCoverage[0].id).toBe("team-2");

      // No ownership issue for unassigned team (it's a structural issue)
      expect(signals.issues.filter((i) => i.entities?.some((e) => e.id === "team-2"))).toHaveLength(0);
    });

    it("unassigned team with owner is still excluded from coverage", () => {
      const data = createMockData({
        teams: [
          { id: "team-1", name: "Unassigned Team", departmentId: null, ownerPersonId: "owner-1", isActive: true },
        ],
        departments: [],
        ownerAssignments: [],
      });

      const signals = resolveOwnershipSignals(data);

      expect(signals.coverage.teams.total).toBe(0);
      expect(signals.unassignedTeamsExcludedFromCoverage).toHaveLength(1);
    });
  });

  describe("department ownership", () => {
    it("departments owned via ownerAssignment or ownerPersonId", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: null, isActive: true },
          { id: "dept-2", name: "Dept 2", ownerPersonId: "owner-1", isActive: true },
        ],
        ownerAssignments: [
          { entityType: "DEPARTMENT", entityId: "dept-1", ownerPersonId: "owner-2" },
        ],
        teams: [],
      });

      const signals = resolveOwnershipSignals(data);

      expect(signals.coverage.departments.total).toBe(2);
      expect(signals.coverage.departments.owned).toBe(2);
      expect(signals.coverage.departments.unowned).toBe(0);
    });

    it("department without owner is flagged", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: null, isActive: true },
        ],
        ownerAssignments: [],
        teams: [],
      });

      const signals = resolveOwnershipSignals(data);

      expect(signals.coverage.departments.unowned).toBe(1);
      expect(signals.issues.some((i) => i.code === "OWNERSHIP_UNOWNED_DEPARTMENT")).toBe(true);
    });

    it("coverage includes empty departments (no teams)", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Empty Dept", ownerPersonId: null, isActive: true },
        ],
        teams: [], // No teams in this department
        ownerAssignments: [],
      });

      const signals = resolveOwnershipSignals(data);

      // Empty department still counts in coverage
      expect(signals.coverage.departments.total).toBe(1);
      expect(signals.coverage.departments.unowned).toBe(1);
    });
  });

  describe("ownership conflict", () => {
    it("emits OWNERSHIP_CONFLICT_TEAM when both sources exist and differ", () => {
      const data = createMockData({
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-A", isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: null, isActive: true },
        ],
        ownerAssignments: [
          { entityType: "TEAM", entityId: "team-1", ownerPersonId: "owner-B" },
        ],
      });

      const signals = resolveOwnershipSignals(data);

      // OwnerAssignment wins, so team is owned
      expect(signals.coverage.teams.owned).toBe(1);

      // Conflict is exposed in conflicts array
      expect(signals.conflicts).toHaveLength(1);
      expect(signals.conflicts[0].id).toBe("team-1");

      // Per-entity state shows conflict
      expect(signals.ownershipByEntity["team:team-1"].hasConflict).toBe(true);

      // Type-specific conflict issue emitted with full metadata
      const conflictIssue = signals.issues.find((i) => i.code === "OWNERSHIP_CONFLICT_TEAM");
      expect(conflictIssue).toBeDefined();
      expect(conflictIssue?.severity).toBe("warning");
      expect(conflictIssue?.meta?.source).toBe("ownerAssignment");
      expect(conflictIssue?.meta?.entityType).toBe("team");
      // Full conflict metadata includes both owner IDs
      expect(conflictIssue?.meta?.assignmentOwnerId).toBe("owner-B");
      expect(conflictIssue?.meta?.entityOwnerPersonId).toBe("owner-A");
    });

    it("emits OWNERSHIP_CONFLICT_DEPARTMENT for department conflicts", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-A", isActive: true },
        ],
        teams: [],
        ownerAssignments: [
          { entityType: "DEPARTMENT", entityId: "dept-1", ownerPersonId: "owner-B" },
        ],
      });

      const signals = resolveOwnershipSignals(data);

      const conflictIssue = signals.issues.find((i) => i.code === "OWNERSHIP_CONFLICT_DEPARTMENT");
      expect(conflictIssue).toBeDefined();
      expect(conflictIssue?.meta?.entityType).toBe("department");
    });

    it("no conflict when sources agree", () => {
      const data = createMockData({
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-A", isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: null, isActive: true },
        ],
        ownerAssignments: [
          { entityType: "TEAM", entityId: "team-1", ownerPersonId: "owner-A" },
        ],
      });

      const signals = resolveOwnershipSignals(data);

      expect(signals.conflicts).toHaveLength(0);
      expect(signals.ownershipByEntity["team:team-1"].hasConflict).toBe(false);
    });
  });

  describe("coverage percentages", () => {
    it("uses Math.floor for conservative reporting", () => {
      // 2 out of 3 = 66.67% → should floor to 66%
      const data = createMockData({
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
          { id: "team-2", name: "Team 2", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
          { id: "team-3", name: "Team 3", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        ],
        ownerAssignments: [],
      });

      const signals = resolveOwnershipSignals(data);

      // 2/3 teams = 66.67% → floor to 66%
      expect(signals.coverage.teams.percent).toBe(66);
      // 1/1 dept = 100%
      expect(signals.coverage.departments.percent).toBe(100);
      // Overall: 3/4 = 75%
      expect(signals.coverage.overallPercent).toBe(75);
    });

    it("returns 100% when no entities exist", () => {
      const data = createMockData({
        teams: [],
        departments: [],
        ownerAssignments: [],
      });

      const signals = resolveOwnershipSignals(data);

      expect(signals.coverage.overallPercent).toBe(100);
    });
  });

  describe("issue aggregation", () => {
    it("aggregates issues when count > 5", () => {
      // Create 6 unowned teams to trigger aggregation
      const teams = Array.from({ length: 6 }, (_, i) => ({
        id: `team-${i}`,
        name: `Team ${i}`,
        departmentId: "dept-1",
        ownerPersonId: null,
        isActive: true,
      }));

      const data = createMockData({
        teams,
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        ],
        ownerAssignments: [],
      });

      const signals = resolveOwnershipSignals(data);

      // Should have one aggregated issue, not 6 individual issues
      const unownedIssues = signals.issues.filter((i) => i.code === "OWNERSHIP_UNOWNED_TEAM");
      expect(unownedIssues).toHaveLength(1);
      expect(unownedIssues[0].meta?.aggregated).toBe(true);
      expect(unownedIssues[0].meta?.count).toBe(6);
      // First 3 entities for preview
      expect(unownedIssues[0].entities).toHaveLength(3);
    });

    it("emits per-entity issues when count <= 5", () => {
      const teams = Array.from({ length: 3 }, (_, i) => ({
        id: `team-${i}`,
        name: `Team ${i}`,
        departmentId: "dept-1",
        ownerPersonId: null,
        isActive: true,
      }));

      const data = createMockData({
        teams,
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        ],
        ownerAssignments: [],
      });

      const signals = resolveOwnershipSignals(data);

      const unownedIssues = signals.issues.filter((i) => i.code === "OWNERSHIP_UNOWNED_TEAM");
      expect(unownedIssues).toHaveLength(3);
      expect(unownedIssues[0].meta?.aggregated).toBeUndefined();
    });
  });

  describe("entity type normalization", () => {
    it("normalizes lowercase entity types", () => {
      const data = createMockData({
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
        departments: [
          { id: "dept-1", name: "Dept 1", ownerPersonId: null, isActive: true },
        ],
        ownerAssignments: [
          // Using lowercase - should be normalized
          { entityType: "team", entityId: "team-1", ownerPersonId: "owner-1" },
        ],
      });

      const signals = resolveOwnershipSignals(data);

      expect(signals.coverage.teams.owned).toBe(1);
    });

    it("emits info issue for unknown entity types", () => {
      const data = createMockData({
        teams: [],
        departments: [],
        ownerAssignments: [
          { entityType: "UNKNOWN_TYPE", entityId: "some-id", ownerPersonId: "owner-1" },
        ],
      });

      const signals = resolveOwnershipSignals(data);

      const unknownTypeIssue = signals.issues.find((i) => i.code === "OWNERSHIP_UNKNOWN_ENTITY_TYPE");
      expect(unknownTypeIssue).toBeDefined();
      expect(unknownTypeIssue?.severity).toBe("info");
      expect(unknownTypeIssue?.meta?.unknownTypes).toContain("UNKNOWN_TYPE");
    });
  });
});

describe("createEntityRef", () => {
  it("creates EntityRef with name for teams", () => {
    const ref = createEntityRef("team", "team-1", "Engineering");
    expect(ref).toEqual({ type: "team", id: "team-1", name: "Engineering" });
  });

  it("creates EntityRef with name for departments", () => {
    const ref = createEntityRef("department", "dept-1", "Product");
    expect(ref).toEqual({ type: "department", id: "dept-1", name: "Product" });
  });

  it("provides fallback name for teams without name", () => {
    const ref = createEntityRef("team", "abcd1234-5678", null);
    expect(ref.type).toBe("team");
    expect(ref.id).toBe("abcd1234-5678");
    expect(ref.name).toMatch(/^Unknown team \(abcd1234\)$/);
  });

  it("provides fallback name for departments without name", () => {
    const ref = createEntityRef("department", "dept-xyz-123", undefined);
    expect(ref.type).toBe("department");
    expect(ref.name).toMatch(/^Unknown department/);
  });

  it("allows undefined name for persons", () => {
    const ref = createEntityRef("person", "person-1", null);
    expect(ref.type).toBe("person");
    expect(ref.id).toBe("person-1");
    expect(ref.name).toBeUndefined();
  });

  it("includes name for persons when provided", () => {
    const ref = createEntityRef("person", "person-1", "John Doe");
    expect(ref).toEqual({ type: "person", id: "person-1", name: "John Doe" });
  });
});

describe("createEntityKey", () => {
  it("creates lowercase key for team", () => {
    const key = createEntityKey("team", "abc123");
    expect(key).toBe("team:abc123");
  });

  it("creates lowercase key for department", () => {
    const key = createEntityKey("department", "xyz789");
    expect(key).toBe("department:xyz789");
  });

  // Note: createEntityKey now ONLY accepts lowercase types
  // Use normalizeEntityTypeFromDB at the query edge for uppercase
});

describe("normalizeEntityTypeFromDB", () => {
  it("normalizes TEAM to team", () => {
    expect(normalizeEntityTypeFromDB("TEAM")).toBe("team");
  });

  it("normalizes DEPARTMENT to department", () => {
    expect(normalizeEntityTypeFromDB("DEPARTMENT")).toBe("department");
  });

  it("normalizes OrgTeam to team", () => {
    expect(normalizeEntityTypeFromDB("OrgTeam")).toBe("team");
    expect(normalizeEntityTypeFromDB("ORGTEAM")).toBe("team");
  });

  it("normalizes OrgDepartment to department", () => {
    expect(normalizeEntityTypeFromDB("OrgDepartment")).toBe("department");
    expect(normalizeEntityTypeFromDB("ORGDEPARTMENT")).toBe("department");
  });

  it("handles lowercase input", () => {
    expect(normalizeEntityTypeFromDB("team")).toBe("team");
    expect(normalizeEntityTypeFromDB("department")).toBe("department");
  });

  it("returns null for unknown types", () => {
    expect(normalizeEntityTypeFromDB("UNKNOWN")).toBeNull();
    expect(normalizeEntityTypeFromDB("PROJECT")).toBeNull();
  });
});

describe("ownershipByEntity key format", () => {
  it("uses lowercase entityType in keys", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Keys must be lowercase
    expect(signals.ownershipByEntity["team:team-1"]).toBeDefined();
    expect(signals.ownershipByEntity["department:dept-1"]).toBeDefined();

    // Uppercase keys should not exist
    expect(signals.ownershipByEntity["TEAM:team-1"]).toBeUndefined();
    expect(signals.ownershipByEntity["DEPARTMENT:dept-1"]).toBeUndefined();
  });

  it("key format matches createEntityKey output", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-abc", name: "Team ABC", departmentId: "dept-1", ownerPersonId: null, isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: null, isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Key should match createEntityKey output
    const expectedTeamKey = createEntityKey("team", "team-abc");
    const expectedDeptKey = createEntityKey("department", "dept-1");

    expect(signals.ownershipByEntity[expectedTeamKey]).toBeDefined();
    expect(signals.ownershipByEntity[expectedDeptKey]).toBeDefined();
  });
});

describe("conflicts invariant", () => {
  it("conflicts[] matches ownershipByEntity entries where hasConflict is true", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Conflict Team", departmentId: "dept-1", ownerPersonId: "owner-A", isActive: true },
        { id: "team-2", name: "No Conflict Team", departmentId: "dept-1", ownerPersonId: "owner-A", isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "Conflict Dept", ownerPersonId: "owner-C", isActive: true },
      ],
      people: [],
      ownerAssignments: [
        { entityType: "TEAM", entityId: "team-1", ownerPersonId: "owner-B" }, // Conflict
        { entityType: "TEAM", entityId: "team-2", ownerPersonId: "owner-A" }, // No conflict (same owner)
        { entityType: "DEPARTMENT", entityId: "dept-1", ownerPersonId: "owner-D" }, // Conflict
      ],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Count conflicts from ownershipByEntity
    const conflictingFromState = Object.values(signals.ownershipByEntity)
      .filter((state) => state.hasConflict);

    // conflicts[] length must match
    expect(signals.conflicts.length).toBe(conflictingFromState.length);

    // Each conflict entity must have corresponding hasConflict=true in ownershipByEntity
    for (const conflict of signals.conflicts) {
      const key = createEntityKey(conflict.type as "team" | "department", conflict.id);
      const state = signals.ownershipByEntity[key];
      expect(state).toBeDefined();
      expect(state?.hasConflict).toBe(true);
    }

    // Verify we have exactly 2 conflicts (team-1 and dept-1)
    expect(signals.conflicts.length).toBe(2);
  });
});

describe("aggregation with constants", () => {
  it("uses ISSUE_AGGREGATION_THRESHOLD and ISSUE_PREVIEW_COUNT correctly", () => {
    // Create exactly threshold + 1 unowned teams to trigger aggregation
    const teams = Array.from({ length: ISSUE_AGGREGATION_THRESHOLD + 1 }, (_, i) => ({
      id: `team-${i}`,
      name: `Team ${i}`,
      departmentId: "dept-1",
      ownerPersonId: null,
      isActive: true,
    }));

    const data: IntelligenceData = {
      teams,
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Should aggregate to single issue
    const unownedIssues = signals.issues.filter((i) => i.code === "OWNERSHIP_UNOWNED_TEAM");
    expect(unownedIssues.length).toBe(1);
    expect(unownedIssues[0].meta?.aggregated).toBe(true);

    // Preview should have exactly ISSUE_PREVIEW_COUNT entities
    expect(unownedIssues[0].entities?.length).toBe(ISSUE_PREVIEW_COUNT);

    // unownedEntities should still have ALL entities (not affected by aggregation)
    expect(signals.unownedEntities.length).toBe(ISSUE_AGGREGATION_THRESHOLD + 1);
  });

  it("aggregation does not affect unownedEntities count", () => {
    // This is a critical invariant for drilldowns
    const teamCount = 10; // Well above threshold
    const teams = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i}`,
      name: `Team ${i}`,
      departmentId: "dept-1",
      ownerPersonId: null,
      isActive: true,
    }));

    const data: IntelligenceData = {
      teams,
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Even with aggregated issues, unownedEntities must have all entities
    expect(signals.unownedEntities.length).toBe(teamCount);

    // coverage.unowned must also match
    expect(signals.coverage.teams.unowned).toBe(teamCount);

    // Verify invariant: unownedEntities.length === coverage.teams.unowned + coverage.departments.unowned
    const totalUnowned = signals.coverage.teams.unowned + signals.coverage.departments.unowned;
    expect(signals.unownedEntities.length).toBe(totalUnowned);
  });
});

describe("conservative percent (Math.floor)", () => {
  it("2/3 = 66% (not 67%)", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        { id: "team-2", name: "Team 2", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        { id: "team-3", name: "Team 3", departmentId: "dept-1", ownerPersonId: null, isActive: true },
      ],
      departments: [],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // 2/3 = 0.666... should floor to 66, not round to 67
    expect(signals.coverage.teams.percent).toBe(66);
  });

  it("1/3 = 33% (not 34%)", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        { id: "team-2", name: "Team 2", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        { id: "team-3", name: "Team 3", departmentId: "dept-1", ownerPersonId: null, isActive: true },
      ],
      departments: [],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // 1/3 = 0.333... should floor to 33, not round to 34
    expect(signals.coverage.teams.percent).toBe(33);
  });

  it("99/100 = 99% (not 100%)", () => {
    const teams = Array.from({ length: 100 }, (_, i) => ({
      id: `team-${i}`,
      name: `Team ${i}`,
      departmentId: "dept-1",
      ownerPersonId: i < 99 ? "owner-1" : null, // 99 owned, 1 unowned
      isActive: true,
    }));

    const data: IntelligenceData = {
      teams,
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // 99/100 = 99%, floor doesn't change this
    expect(signals.coverage.teams.percent).toBe(99);
  });
});

describe("unknown entity type aggregation", () => {
  it("emits single issue with count for multiple unknown assignments", () => {
    const data: IntelligenceData = {
      teams: [],
      departments: [],
      people: [],
      ownerAssignments: [
        { entityType: "UNKNOWN_A", entityId: "id-1", ownerPersonId: "owner-1" },
        { entityType: "UNKNOWN_A", entityId: "id-2", ownerPersonId: "owner-1" },
        { entityType: "UNKNOWN_B", entityId: "id-3", ownerPersonId: "owner-1" },
      ],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Should emit exactly ONE issue (not 3)
    const unknownIssues = signals.issues.filter((i) => i.code === "OWNERSHIP_UNKNOWN_ENTITY_TYPE");
    expect(unknownIssues.length).toBe(1);

    // Should include assignment count (renamed from count for clarity)
    expect(unknownIssues[0].meta?.assignmentCount).toBe(3);

    // Should include unique types
    expect(unknownIssues[0].meta?.unknownTypes).toEqual(["UNKNOWN_A", "UNKNOWN_B"]);
  });
});

describe("empty departments in coverage", () => {
  it("emits info issue when coverage includes empty departments", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "Dept With Teams", ownerPersonId: "owner-1", isActive: true },
        { id: "dept-2", name: "Empty Dept", ownerPersonId: null, isActive: true }, // No teams
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Should emit info issue about empty departments
    const emptyDeptIssue = signals.issues.find(
      (i) => i.code === "OWNERSHIP_COVERAGE_INCLUDES_EMPTY_DEPARTMENTS"
    );
    expect(emptyDeptIssue).toBeDefined();
    expect(emptyDeptIssue?.severity).toBe("info");
    expect(emptyDeptIssue?.meta?.emptyDepartmentCount).toBe(1);

    // Both departments should be in coverage
    expect(signals.coverage.departments.total).toBe(2);
  });

  it("does not emit issue when no empty departments", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-1", isActive: true },
        { id: "team-2", name: "Team 2", departmentId: "dept-2", ownerPersonId: "owner-1", isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: "owner-1", isActive: true },
        { id: "dept-2", name: "Dept 2", ownerPersonId: "owner-1", isActive: true },
      ],
      people: [],
      ownerAssignments: [],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // Should NOT emit the issue
    const emptyDeptIssue = signals.issues.find(
      (i) => i.code === "OWNERSHIP_COVERAGE_INCLUDES_EMPTY_DEPARTMENTS"
    );
    expect(emptyDeptIssue).toBeUndefined();
  });
});

describe("canonical issue codes", () => {
  it("all emitted ownership issues use canonical codes", () => {
    const data: IntelligenceData = {
      teams: [
        { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: "owner-A", isActive: true },
        { id: "team-2", name: "Team 2", departmentId: "dept-1", ownerPersonId: null, isActive: true },
      ],
      departments: [
        { id: "dept-1", name: "Dept 1", ownerPersonId: null, isActive: true },
        { id: "dept-2", name: "Empty Dept", ownerPersonId: null, isActive: true },
      ],
      people: [],
      ownerAssignments: [
        { entityType: "TEAM", entityId: "team-1", ownerPersonId: "owner-B" }, // Conflict
        { entityType: "UNKNOWN", entityId: "x", ownerPersonId: "y" }, // Unknown
      ],
      workspaceOwnerId: "owner-1",
    };

    const signals = resolveOwnershipSignals(data);

    // All emitted issue codes must be in the canonical set
    for (const issue of signals.issues) {
      expect(ORG_SNAPSHOT_ISSUE_CODES_SET.has(issue.code)).toBe(true);
    }
  });
});
