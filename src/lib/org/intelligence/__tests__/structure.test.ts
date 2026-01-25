/**
 * Structure Resolver Tests
 *
 * Tests canonical structure rules from docs/org/intelligence-rules.md:
 * - Unassigned teams (departmentId = null) listed correctly
 * - Departments without teams flagged
 * - Team-person relation schema guard (info issue if not modeled)
 */

import { describe, it, expect } from "vitest";
import { resolveStructureSignals } from "../resolvers/structure";
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

describe("resolveStructureSignals", () => {
  describe("unassigned teams", () => {
    it("unassigned teams listed correctly", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Engineering", ownerPersonId: null, isActive: true },
        ],
        teams: [
          { id: "team-1", name: "Frontend", departmentId: "dept-1", ownerPersonId: null, isActive: true },
          { id: "team-2", name: "Unassigned Team", departmentId: null, ownerPersonId: null, isActive: true },
        ],
      });

      const signals = resolveStructureSignals(data);

      expect(signals.unassignedTeams).toHaveLength(1);
      expect(signals.unassignedTeams[0]).toMatchObject({
        type: "team",
        id: "team-2",
        name: "Unassigned Team",
      });

      // Issue emitted for unassigned team
      expect(signals.issues.some((i) => i.code === "STRUCTURE_UNASSIGNED_TEAM")).toBe(true);
    });

    it("teams assigned to departments grouped correctly", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Engineering", ownerPersonId: null, isActive: true },
          { id: "dept-2", name: "Design", ownerPersonId: null, isActive: true },
        ],
        teams: [
          { id: "team-1", name: "Frontend", departmentId: "dept-1", ownerPersonId: null, isActive: true },
          { id: "team-2", name: "Backend", departmentId: "dept-1", ownerPersonId: null, isActive: true },
          { id: "team-3", name: "UX", departmentId: "dept-2", ownerPersonId: null, isActive: true },
        ],
      });

      const signals = resolveStructureSignals(data);

      expect(signals.teamsByDepartment["dept-1"]).toHaveLength(2);
      expect(signals.teamsByDepartment["dept-2"]).toHaveLength(1);
      expect(signals.unassignedTeams).toHaveLength(0);
    });
  });

  describe("departments without teams", () => {
    it("departmentsWithoutTeams computed correctly", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Engineering", ownerPersonId: null, isActive: true },
          { id: "dept-2", name: "Empty Dept", ownerPersonId: null, isActive: true },
        ],
        teams: [
          { id: "team-1", name: "Frontend", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
      });

      const signals = resolveStructureSignals(data);

      expect(signals.departmentsWithoutTeams).toHaveLength(1);
      expect(signals.departmentsWithoutTeams[0]).toMatchObject({
        type: "department",
        id: "dept-2",
        name: "Empty Dept",
      });

      // Issue emitted
      expect(signals.issues.some((i) => i.code === "STRUCTURE_EMPTY_DEPARTMENT")).toBe(true);
    });

    it("no issue when all departments have teams", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Engineering", ownerPersonId: null, isActive: true },
        ],
        teams: [
          { id: "team-1", name: "Frontend", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
      });

      const signals = resolveStructureSignals(data);

      expect(signals.departmentsWithoutTeams).toHaveLength(0);
      expect(signals.issues.filter((i) => i.code === "STRUCTURE_EMPTY_DEPARTMENT")).toHaveLength(0);
    });
  });

  describe("team-person relation schema guard", () => {
    it("teamsWithoutPeople returns info issue if relation not modeled", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Engineering", ownerPersonId: null, isActive: true },
        ],
        teams: [
          { id: "team-1", name: "Frontend", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
        // No people have teamId populated
        people: [
          { id: "person-1", name: "Alice", positionId: "pos-1", teamId: null, managerId: null, level: 1, isActive: true },
        ],
      });

      const signals = resolveStructureSignals(data);

      // Schema guard: relation not modeled
      expect(signals.teamsWithoutPeople).toHaveLength(0); // Empty array, not false positives
      expect(signals.peopleWithoutTeams).toHaveLength(0); // Empty array

      // Info issue emitted
      const schemaIssue = signals.issues.find(
        (i) => i.code === "STRUCTURE_TEAM_PERSON_RELATION_NOT_MODELED"
      );
      expect(schemaIssue).toBeDefined();
      expect(schemaIssue?.severity).toBe("info");
    });

    it("teamsWithoutPeople computed when relation is modeled", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Engineering", ownerPersonId: null, isActive: true },
        ],
        teams: [
          { id: "team-1", name: "With People", departmentId: "dept-1", ownerPersonId: null, isActive: true },
          { id: "team-2", name: "Empty Team", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
        // Some people have teamId populated (relation is modeled)
        people: [
          { id: "person-1", name: "Alice", positionId: "pos-1", teamId: "team-1", managerId: null, level: 1, isActive: true },
        ],
      });

      const signals = resolveStructureSignals(data);

      // team-2 has no people
      expect(signals.teamsWithoutPeople).toHaveLength(1);
      expect(signals.teamsWithoutPeople[0].id).toBe("team-2");

      // No schema guard issue (relation is modeled)
      expect(
        signals.issues.filter((i) => i.code === "STRUCTURE_TEAM_PERSON_RELATION_NOT_MODELED")
      ).toHaveLength(0);
    });

    it("peopleWithoutTeams computed when relation is modeled", () => {
      const data = createMockData({
        departments: [],
        teams: [
          { id: "team-1", name: "Team 1", departmentId: "dept-1", ownerPersonId: null, isActive: true },
        ],
        people: [
          { id: "person-1", name: "Alice", positionId: "pos-1", teamId: "team-1", managerId: null, level: 1, isActive: true },
          { id: "person-2", name: "Bob", positionId: "pos-2", teamId: null, managerId: null, level: 2, isActive: true },
        ],
      });

      const signals = resolveStructureSignals(data);

      // person-2 has no team
      expect(signals.peopleWithoutTeams).toHaveLength(1);
      expect(signals.peopleWithoutTeams[0].id).toBe("person-2");
    });
  });

  describe("departments list", () => {
    it("departments list populated correctly", () => {
      const data = createMockData({
        departments: [
          { id: "dept-1", name: "Engineering", ownerPersonId: null, isActive: true },
          { id: "dept-2", name: "Design", ownerPersonId: null, isActive: true },
        ],
        teams: [],
      });

      const signals = resolveStructureSignals(data);

      expect(signals.departments).toHaveLength(2);
      expect(signals.departments.map((d) => d.id).sort()).toEqual(["dept-1", "dept-2"]);
    });
  });
});
