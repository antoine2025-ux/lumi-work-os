/**
 * People Resolver Tests
 *
 * Tests canonical manager rules from docs/org/intelligence-rules.md:
 * - Workspace owner exempt from MISSING_MANAGER
 * - Executive (level === 1) exempt from MISSING_MANAGER
 * - Multiple non-exempt roots flagged as PEOPLE_MULTIPLE_ROOTS
 * - Manager load computed correctly
 */

import { describe, it, expect } from "vitest";
import { resolvePeopleSignals } from "../resolvers/people";
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

describe("resolvePeopleSignals", () => {
  describe("manager exemptions", () => {
    it("workspace owner exempt from MISSING_MANAGER", () => {
      const data = createMockData({
        workspaceOwnerId: "person-1",
        people: [
          { id: "person-1", name: "CEO", positionId: "pos-1", teamId: null, managerId: null, level: 2, isActive: true },
          { id: "person-2", name: "Employee", positionId: "pos-2", teamId: null, managerId: "person-1", level: 3, isActive: true },
        ],
      });

      const signals = resolvePeopleSignals(data);

      // Workspace owner (person-1) has no manager but is exempt
      expect(signals.peopleWithoutManagers).toHaveLength(0);
      expect(signals.issues.filter((i) => i.code === "PEOPLE_MULTIPLE_ROOTS")).toHaveLength(0);
    });

    it("executive (level === 1) exempt from MISSING_MANAGER", () => {
      const data = createMockData({
        workspaceOwnerId: "someone-else",
        people: [
          { id: "person-1", name: "CEO", positionId: "pos-1", teamId: null, managerId: null, level: 1, isActive: true },
          { id: "person-2", name: "VP", positionId: "pos-2", teamId: null, managerId: "person-1", level: 2, isActive: true },
        ],
      });

      const signals = resolvePeopleSignals(data);

      // Executive (level 1) has no manager but is exempt
      expect(signals.peopleWithoutManagers).toHaveLength(0);
    });

    it("non-executive non-owner without manager is flagged", () => {
      const data = createMockData({
        workspaceOwnerId: "someone-else",
        people: [
          { id: "person-1", name: "Random Person", positionId: "pos-1", teamId: null, managerId: null, level: 3, isActive: true },
        ],
      });

      const signals = resolvePeopleSignals(data);

      expect(signals.peopleWithoutManagers).toHaveLength(1);
      expect(signals.peopleWithoutManagers[0].id).toBe("person-1");
    });
  });

  describe("multiple roots", () => {
    it("multiple roots flagged if not exempt", () => {
      const data = createMockData({
        workspaceOwnerId: "someone-else",
        people: [
          { id: "person-1", name: "Person 1", positionId: "pos-1", teamId: null, managerId: null, level: 3, isActive: true },
          { id: "person-2", name: "Person 2", positionId: "pos-2", teamId: null, managerId: null, level: 4, isActive: true },
        ],
      });

      const signals = resolvePeopleSignals(data);

      expect(signals.peopleWithoutManagers).toHaveLength(2);
      const issue = signals.issues.find((i) => i.code === "PEOPLE_MULTIPLE_ROOTS");
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.entities).toHaveLength(2);
    });

    it("no multiple roots warning when only one exempt root", () => {
      const data = createMockData({
        workspaceOwnerId: "person-1",
        people: [
          { id: "person-1", name: "CEO", positionId: "pos-1", teamId: null, managerId: null, level: 1, isActive: true },
          { id: "person-2", name: "VP", positionId: "pos-2", teamId: null, managerId: "person-1", level: 2, isActive: true },
          { id: "person-3", name: "Manager", positionId: "pos-3", teamId: null, managerId: "person-2", level: 3, isActive: true },
        ],
      });

      const signals = resolvePeopleSignals(data);

      expect(signals.peopleWithoutManagers).toHaveLength(0);
      expect(signals.issues.filter((i) => i.code === "PEOPLE_MULTIPLE_ROOTS")).toHaveLength(0);
    });
  });

  describe("manager load", () => {
    it("manager load counts stable", () => {
      const data = createMockData({
        workspaceOwnerId: "person-1",
        people: [
          { id: "person-1", name: "CEO", positionId: "pos-1", teamId: null, managerId: null, level: 1, isActive: true },
          { id: "person-2", name: "Report 1", positionId: "pos-2", teamId: null, managerId: "person-1", level: 2, isActive: true },
          { id: "person-3", name: "Report 2", positionId: "pos-3", teamId: null, managerId: "person-1", level: 2, isActive: true },
          { id: "person-4", name: "Report 3", positionId: "pos-4", teamId: null, managerId: "person-1", level: 2, isActive: true },
        ],
      });

      const signals = resolvePeopleSignals(data);

      expect(signals.managerLoad).toHaveLength(1);
      expect(signals.managerLoad[0]).toMatchObject({
        manager: { type: "person", id: "person-1" },
        directReports: 3,
      });
    });

    it("overloaded managers flagged (threshold = 8)", () => {
      const reports = Array.from({ length: 9 }, (_, i) => ({
        id: `person-${i + 2}`,
        name: `Report ${i + 1}`,
        positionId: `pos-${i + 2}`,
        teamId: null,
        managerId: "person-1",
        level: 2,
        isActive: true,
      }));

      const data = createMockData({
        workspaceOwnerId: "person-1",
        people: [
          { id: "person-1", name: "Manager", positionId: "pos-1", teamId: null, managerId: null, level: 1, isActive: true },
          ...reports,
        ],
      });

      const signals = resolvePeopleSignals(data);

      expect(signals.overloadedManagers).toHaveLength(1);
      expect(signals.overloadedManagers[0].directReports).toBe(9);
      expect(signals.issues.some((i) => i.code === "PEOPLE_MANAGER_OVERLOAD")).toBe(true);
    });

    it("manager load sorted by direct reports descending", () => {
      const data = createMockData({
        workspaceOwnerId: "person-1",
        people: [
          { id: "person-1", name: "CEO", positionId: "pos-1", teamId: null, managerId: null, level: 1, isActive: true },
          { id: "person-2", name: "VP1", positionId: "pos-2", teamId: null, managerId: "person-1", level: 2, isActive: true },
          { id: "person-3", name: "VP2", positionId: "pos-3", teamId: null, managerId: "person-1", level: 2, isActive: true },
          { id: "person-4", name: "Report", positionId: "pos-4", teamId: null, managerId: "person-2", level: 3, isActive: true },
        ],
      });

      const signals = resolvePeopleSignals(data);

      // person-1 has 2 reports, person-2 has 1 report
      expect(signals.managerLoad[0].directReports).toBe(2);
      expect(signals.managerLoad[1].directReports).toBe(1);
    });
  });
});
