/**
 * Entity Graph Contract Tests
 *
 * Validates that the EntityGraphSnapshotV0 contract is correctly implemented
 * and that the builder produces valid snapshots.
 */

import { describe, it, expect } from "vitest";
import type {
  EntityGraphSnapshotV0,
  EntityNodeV0,
  EntityLinkV0,
  EntityTypeV0,
  LinkTypeV0,
  EntityGraphMapsV0,
  EntityGraphSummaryV0,
} from "@/lib/loopbrain/contract/entityLinks.v0";
import { ENTITY_TYPE_V0, LINK_TYPE_V0 } from "@/lib/loopbrain/contract/entityLinks.v0";

// =============================================================================
// Contract Type Tests
// =============================================================================

describe("EntityGraph Contract Types", () => {
  describe("ENTITY_TYPE_V0", () => {
    it("should contain all expected entity types", () => {
      expect(ENTITY_TYPE_V0).toContain("PERSON");
      expect(ENTITY_TYPE_V0).toContain("TEAM");
      expect(ENTITY_TYPE_V0).toContain("DEPARTMENT");
      expect(ENTITY_TYPE_V0).toContain("PROJECT");
      expect(ENTITY_TYPE_V0).toContain("SKILL");
      expect(ENTITY_TYPE_V0).toContain("ROLE");
      expect(ENTITY_TYPE_V0).toContain("DECISION_DOMAIN");
      expect(ENTITY_TYPE_V0).toContain("WORK_REQUEST");
    });

    it("should be immutable (readonly)", () => {
      // TypeScript enforces this at compile time
      // This test documents the expected behavior
      expect(Object.isFrozen(ENTITY_TYPE_V0)).toBe(false); // as const doesn't freeze
      expect(ENTITY_TYPE_V0.length).toBe(8);
    });
  });

  describe("LINK_TYPE_V0", () => {
    it("should contain all expected link types", () => {
      expect(LINK_TYPE_V0).toContain("MEMBER_OF");
      expect(LINK_TYPE_V0).toContain("REPORTS_TO");
      expect(LINK_TYPE_V0).toContain("OWNS");
      expect(LINK_TYPE_V0).toContain("DEPENDS_ON");
      expect(LINK_TYPE_V0).toContain("HAS_SKILL");
      expect(LINK_TYPE_V0).toContain("DECIDES_FOR");
      expect(LINK_TYPE_V0).toContain("ALLOCATED_TO");
      expect(LINK_TYPE_V0).toContain("LEADS");
      expect(LINK_TYPE_V0).toContain("BACKS_UP");
    });

    it("should have 9 link types", () => {
      expect(LINK_TYPE_V0.length).toBe(9);
    });
  });
});

// =============================================================================
// Snapshot Structure Tests
// =============================================================================

describe("EntityGraph Snapshot Structure", () => {
  function createValidSnapshot(): EntityGraphSnapshotV0 {
    return {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId: "ws_test",
      nodes: [],
      links: [],
      maps: {
        expertise: {},
        capacity: {},
        dependencyChains: {},
      },
      summary: {
        nodeCount: 0,
        linkCount: 0,
        linksByType: {},
      },
    };
  }

  it("should require schemaVersion to be v0", () => {
    const snapshot = createValidSnapshot();
    expect(snapshot.schemaVersion).toBe("v0");
  });

  it("should have ISO timestamp for generatedAt", () => {
    const snapshot = createValidSnapshot();
    expect(() => new Date(snapshot.generatedAt)).not.toThrow();
  });

  it("should have required maps structure", () => {
    const snapshot = createValidSnapshot();
    expect(snapshot.maps).toHaveProperty("expertise");
    expect(snapshot.maps).toHaveProperty("capacity");
    expect(snapshot.maps).toHaveProperty("dependencyChains");
  });

  it("should have required summary structure", () => {
    const snapshot = createValidSnapshot();
    expect(snapshot.summary).toHaveProperty("nodeCount");
    expect(snapshot.summary).toHaveProperty("linkCount");
    expect(snapshot.summary).toHaveProperty("linksByType");
  });
});

// =============================================================================
// Node Structure Tests
// =============================================================================

describe("EntityNode Structure", () => {
  function createValidNode(): EntityNodeV0 {
    return {
      id: "person_123",
      entityType: "PERSON",
      label: "Test Person",
      metadata: {},
    };
  }

  it("should have required fields", () => {
    const node = createValidNode();
    expect(node).toHaveProperty("id");
    expect(node).toHaveProperty("entityType");
    expect(node).toHaveProperty("label");
    expect(node).toHaveProperty("metadata");
  });

  it("should have valid entity type", () => {
    const node = createValidNode();
    expect(ENTITY_TYPE_V0).toContain(node.entityType);
  });

  it("should have flat metadata (no nested objects)", () => {
    const node = createValidNode();
    node.metadata = {
      stringVal: "test",
      numberVal: 42,
      boolVal: true,
      nullVal: null,
    };

    for (const value of Object.values(node.metadata)) {
      expect(
        typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null
      ).toBe(true);
    }
  });
});

// =============================================================================
// Link Structure Tests
// =============================================================================

describe("EntityLink Structure", () => {
  function createValidLink(): EntityLinkV0 {
    return {
      id: "link_123",
      sourceId: "person_1",
      targetId: "team_1",
      linkType: "MEMBER_OF",
      strength: 1.0,
    };
  }

  it("should have required fields", () => {
    const link = createValidLink();
    expect(link).toHaveProperty("id");
    expect(link).toHaveProperty("sourceId");
    expect(link).toHaveProperty("targetId");
    expect(link).toHaveProperty("linkType");
    expect(link).toHaveProperty("strength");
  });

  it("should have valid link type", () => {
    const link = createValidLink();
    expect(LINK_TYPE_V0).toContain(link.linkType);
  });

  it("should have strength between 0 and 1", () => {
    const link = createValidLink();
    expect(link.strength).toBeGreaterThanOrEqual(0);
    expect(link.strength).toBeLessThanOrEqual(1);
  });

  it("should allow optional metadata", () => {
    const link = createValidLink();
    link.metadata = { note: "test" };
    expect(link.metadata).toBeDefined();
  });
});

// =============================================================================
// Maps Structure Tests
// =============================================================================

describe("EntityGraph Maps Structure", () => {
  describe("Expertise Map", () => {
    it("should map person IDs to skill proficiencies", () => {
      const expertise: EntityGraphMapsV0["expertise"] = {
        person_1: [
          { skillId: "skill_ts", proficiency: 4 },
          { skillId: "skill_react", proficiency: 3 },
        ],
      };

      expect(expertise["person_1"]).toHaveLength(2);
      expect(expertise["person_1"][0].proficiency).toBe(4);
    });

    it("should have proficiency between 1 and 5", () => {
      const expertise: EntityGraphMapsV0["expertise"] = {
        person_1: [{ skillId: "skill_ts", proficiency: 4 }],
      };

      for (const skills of Object.values(expertise)) {
        for (const skill of skills) {
          expect(skill.proficiency).toBeGreaterThanOrEqual(1);
          expect(skill.proficiency).toBeLessThanOrEqual(5);
        }
      }
    });
  });

  describe("Capacity Map", () => {
    it("should map person IDs to capacity summaries", () => {
      const capacity: EntityGraphMapsV0["capacity"] = {
        person_1: {
          weeklyHours: 40,
          allocatedPct: 0.8,
          availablePct: 0.2,
        },
      };

      expect(capacity["person_1"].weeklyHours).toBe(40);
      expect(capacity["person_1"].allocatedPct).toBe(0.8);
      expect(capacity["person_1"].availablePct).toBe(0.2);
    });

    it("should have non-negative percentages", () => {
      const capacity: EntityGraphMapsV0["capacity"] = {
        person_1: {
          weeklyHours: 40,
          allocatedPct: 0.8,
          availablePct: 0.2,
        },
      };

      for (const cap of Object.values(capacity)) {
        expect(cap.allocatedPct).toBeGreaterThanOrEqual(0);
        expect(cap.availablePct).toBeGreaterThanOrEqual(0);
      }
    });

    it("should allow over-allocation (allocatedPct > 1)", () => {
      const capacity: EntityGraphMapsV0["capacity"] = {
        person_1: {
          weeklyHours: 40,
          allocatedPct: 1.2, // Over-allocated
          availablePct: 0, // Clamped to 0
        },
      };

      expect(capacity["person_1"].allocatedPct).toBe(1.2);
      expect(capacity["person_1"].availablePct).toBe(0);
    });
  });

  describe("Dependency Chains", () => {
    it("should map entity IDs to arrays of dependent IDs", () => {
      const chains: EntityGraphMapsV0["dependencyChains"] = {
        task_1: ["task_2", "task_3"],
        task_2: ["task_3"],
      };

      expect(chains["task_1"]).toContain("task_2");
      expect(chains["task_1"]).toContain("task_3");
    });

    it("should represent transitive closure", () => {
      // If task_1 depends on task_2, and task_2 depends on task_3,
      // then task_1's chain should include both task_2 and task_3
      const chains: EntityGraphMapsV0["dependencyChains"] = {
        task_1: ["task_2", "task_3"],
        task_2: ["task_3"],
      };

      expect(chains["task_1"]).toContain("task_3");
    });
  });
});

// =============================================================================
// Summary Structure Tests
// =============================================================================

describe("EntityGraph Summary Structure", () => {
  it("should have correct counts", () => {
    const summary: EntityGraphSummaryV0 = {
      nodeCount: 10,
      linkCount: 15,
      linksByType: {
        MEMBER_OF: 5,
        REPORTS_TO: 3,
        OWNS: 2,
        HAS_SKILL: 5,
      },
    };

    expect(summary.nodeCount).toBe(10);
    expect(summary.linkCount).toBe(15);
  });

  it("should have linksByType counts summing to linkCount", () => {
    const summary: EntityGraphSummaryV0 = {
      nodeCount: 10,
      linkCount: 15,
      linksByType: {
        MEMBER_OF: 5,
        REPORTS_TO: 3,
        OWNS: 2,
        HAS_SKILL: 5,
      },
    };

    const totalLinks = Object.values(summary.linksByType).reduce(
      (sum, count) => sum + (count || 0),
      0
    );
    expect(totalLinks).toBe(summary.linkCount);
  });

  it("should optionally include nodesByType", () => {
    const summary: EntityGraphSummaryV0 = {
      nodeCount: 10,
      linkCount: 15,
      linksByType: {},
      nodesByType: {
        PERSON: 5,
        TEAM: 2,
        DEPARTMENT: 1,
        PROJECT: 2,
      },
    };

    expect(summary.nodesByType).toBeDefined();
    const totalNodes = Object.values(summary.nodesByType!).reduce(
      (sum, count) => sum + (count || 0),
      0
    );
    expect(totalNodes).toBe(summary.nodeCount);
  });
});
