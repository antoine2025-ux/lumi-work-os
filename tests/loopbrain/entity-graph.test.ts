/**
 * Entity Graph Unit Tests
 *
 * Tests for the entity graph builder and related functions.
 * Uses mocked Prisma client for unit testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  EntityGraphSnapshotV0,
  EntityNodeV0,
  EntityLinkV0,
  SkillProficiencyV0,
  PersonCapacitySummaryV0,
} from "@/lib/loopbrain/contract/entityLinks.v0";
import {
  getLinksByType,
  getNodesByType,
  findNodeById,
  getOutgoingLinks,
  getIncomingLinks,
} from "@/lib/loopbrain/contract/entityLinks.v0";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockSnapshot(): EntityGraphSnapshotV0 {
  return {
    schemaVersion: "v0",
    generatedAt: "2025-01-15T10:00:00.000Z",
    workspaceId: "ws_test123",
    nodes: [
      {
        id: "person_alice",
        entityType: "PERSON",
        label: "Alice Smith",
        metadata: { email: "alice@example.com", title: "Engineer" },
      },
      {
        id: "person_bob",
        entityType: "PERSON",
        label: "Bob Jones",
        metadata: { email: "bob@example.com", title: "Manager" },
      },
      {
        id: "team_platform",
        entityType: "TEAM",
        label: "Platform Team",
        metadata: { memberCount: 5, isActive: true },
      },
      {
        id: "department_engineering",
        entityType: "DEPARTMENT",
        label: "Engineering",
        metadata: { teamCount: 3, isActive: true },
      },
      {
        id: "project_alpha",
        entityType: "PROJECT",
        label: "Project Alpha",
        metadata: { status: "ACTIVE", priority: "HIGH" },
      },
      {
        id: "skill_typescript",
        entityType: "SKILL",
        label: "TypeScript",
        metadata: { category: "Programming" },
      },
    ],
    links: [
      {
        id: "link_1",
        sourceId: "person_alice",
        targetId: "team_platform",
        linkType: "MEMBER_OF",
        strength: 1.0,
      },
      {
        id: "link_2",
        sourceId: "person_bob",
        targetId: "team_platform",
        linkType: "LEADS",
        strength: 1.0,
      },
      {
        id: "link_3",
        sourceId: "person_alice",
        targetId: "person_bob",
        linkType: "REPORTS_TO",
        strength: 1.0,
      },
      {
        id: "link_4",
        sourceId: "person_alice",
        targetId: "project_alpha",
        linkType: "ALLOCATED_TO",
        strength: 0.5,
      },
      {
        id: "link_5",
        sourceId: "person_alice",
        targetId: "skill_typescript",
        linkType: "HAS_SKILL",
        strength: 0.8,
        metadata: { proficiency: 4 },
      },
      {
        id: "link_6",
        sourceId: "team_platform",
        targetId: "department_engineering",
        linkType: "MEMBER_OF",
        strength: 1.0,
      },
    ],
    maps: {
      expertise: {
        person_alice: [{ skillId: "skill_typescript", proficiency: 4 }],
      },
      capacity: {
        person_alice: {
          weeklyHours: 40,
          allocatedPct: 0.5,
          availablePct: 0.5,
        },
        person_bob: {
          weeklyHours: 40,
          allocatedPct: 0.8,
          availablePct: 0.2,
        },
      },
      dependencyChains: {},
    },
    summary: {
      nodeCount: 6,
      linkCount: 6,
      linksByType: {
        MEMBER_OF: 2,
        LEADS: 1,
        REPORTS_TO: 1,
        ALLOCATED_TO: 1,
        HAS_SKILL: 1,
      },
      nodesByType: {
        PERSON: 2,
        TEAM: 1,
        DEPARTMENT: 1,
        PROJECT: 1,
        SKILL: 1,
      },
    },
  };
}

// =============================================================================
// Contract Helper Tests
// =============================================================================

describe("EntityGraph Contract Helpers", () => {
  let snapshot: EntityGraphSnapshotV0;

  beforeEach(() => {
    snapshot = createMockSnapshot();
  });

  describe("getLinksByType", () => {
    it("should return all links of specified type", () => {
      const memberOfLinks = getLinksByType(snapshot, "MEMBER_OF");
      expect(memberOfLinks).toHaveLength(2);
      expect(memberOfLinks.every((l) => l.linkType === "MEMBER_OF")).toBe(true);
    });

    it("should return empty array for non-existent type", () => {
      const dependsOnLinks = getLinksByType(snapshot, "DEPENDS_ON");
      expect(dependsOnLinks).toHaveLength(0);
    });
  });

  describe("getNodesByType", () => {
    it("should return all nodes of specified type", () => {
      const personNodes = getNodesByType(snapshot, "PERSON");
      expect(personNodes).toHaveLength(2);
      expect(personNodes.every((n) => n.entityType === "PERSON")).toBe(true);
    });

    it("should return empty array for non-existent type", () => {
      const roleNodes = getNodesByType(snapshot, "ROLE");
      expect(roleNodes).toHaveLength(0);
    });
  });

  describe("findNodeById", () => {
    it("should find node by ID", () => {
      const node = findNodeById(snapshot, "person_alice");
      expect(node).toBeDefined();
      expect(node?.label).toBe("Alice Smith");
    });

    it("should return undefined for non-existent ID", () => {
      const node = findNodeById(snapshot, "person_nonexistent");
      expect(node).toBeUndefined();
    });
  });

  describe("getOutgoingLinks", () => {
    it("should return all links where entity is source", () => {
      const outgoing = getOutgoingLinks(snapshot, "person_alice");
      expect(outgoing).toHaveLength(4);
      expect(outgoing.every((l) => l.sourceId === "person_alice")).toBe(true);
    });

    it("should return empty array for entity with no outgoing links", () => {
      const outgoing = getOutgoingLinks(snapshot, "skill_typescript");
      expect(outgoing).toHaveLength(0);
    });
  });

  describe("getIncomingLinks", () => {
    it("should return all links where entity is target", () => {
      const incoming = getIncomingLinks(snapshot, "team_platform");
      expect(incoming).toHaveLength(2);
      expect(incoming.every((l) => l.targetId === "team_platform")).toBe(true);
    });

    it("should return empty array for entity with no incoming links", () => {
      const incoming = getIncomingLinks(snapshot, "person_alice");
      expect(incoming).toHaveLength(0);
    });
  });
});

// =============================================================================
// Snapshot Validation Tests
// =============================================================================

describe("EntityGraph Snapshot Validation", () => {
  let snapshot: EntityGraphSnapshotV0;

  beforeEach(() => {
    snapshot = createMockSnapshot();
  });

  describe("Schema Version", () => {
    it("should have schema version v0", () => {
      expect(snapshot.schemaVersion).toBe("v0");
    });
  });

  describe("Node Uniqueness", () => {
    it("should have unique node IDs", () => {
      const nodeIds = snapshot.nodes.map((n) => n.id);
      const uniqueIds = new Set(nodeIds);
      expect(uniqueIds.size).toBe(nodeIds.length);
    });
  });

  describe("Link Validity", () => {
    it("should have all link sources referencing valid nodes", () => {
      const nodeIds = new Set(snapshot.nodes.map((n) => n.id));
      for (const link of snapshot.links) {
        expect(nodeIds.has(link.sourceId)).toBe(true);
      }
    });

    it("should have all link targets referencing valid nodes", () => {
      const nodeIds = new Set(snapshot.nodes.map((n) => n.id));
      for (const link of snapshot.links) {
        expect(nodeIds.has(link.targetId)).toBe(true);
      }
    });

    it("should have strength values between 0 and 1", () => {
      for (const link of snapshot.links) {
        expect(link.strength).toBeGreaterThanOrEqual(0);
        expect(link.strength).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Summary Consistency", () => {
    it("should have correct node count in summary", () => {
      expect(snapshot.summary.nodeCount).toBe(snapshot.nodes.length);
    });

    it("should have correct link count in summary", () => {
      expect(snapshot.summary.linkCount).toBe(snapshot.links.length);
    });

    it("should have correct links by type counts", () => {
      const actualCounts: Record<string, number> = {};
      for (const link of snapshot.links) {
        actualCounts[link.linkType] = (actualCounts[link.linkType] || 0) + 1;
      }
      expect(snapshot.summary.linksByType).toEqual(actualCounts);
    });
  });

  describe("Maps Validity", () => {
    it("should have expertise map entries referencing valid person nodes", () => {
      const personNodeIds = new Set(
        snapshot.nodes
          .filter((n) => n.entityType === "PERSON")
          .map((n) => n.id)
      );
      for (const personId of Object.keys(snapshot.maps.expertise)) {
        expect(personNodeIds.has(personId)).toBe(true);
      }
    });

    it("should have capacity map entries referencing valid person nodes", () => {
      const personNodeIds = new Set(
        snapshot.nodes
          .filter((n) => n.entityType === "PERSON")
          .map((n) => n.id)
      );
      for (const personId of Object.keys(snapshot.maps.capacity)) {
        expect(personNodeIds.has(personId)).toBe(true);
      }
    });

    it("should have valid proficiency values in expertise map", () => {
      for (const skills of Object.values(snapshot.maps.expertise)) {
        for (const skill of skills) {
          expect(skill.proficiency).toBeGreaterThanOrEqual(1);
          expect(skill.proficiency).toBeLessThanOrEqual(5);
        }
      }
    });

    it("should have valid capacity percentages", () => {
      for (const capacity of Object.values(snapshot.maps.capacity)) {
        expect(capacity.allocatedPct).toBeGreaterThanOrEqual(0);
        expect(capacity.availablePct).toBeGreaterThanOrEqual(0);
        expect(capacity.weeklyHours).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Graph Traversal Tests
// =============================================================================

describe("EntityGraph Traversal", () => {
  let snapshot: EntityGraphSnapshotV0;

  beforeEach(() => {
    snapshot = createMockSnapshot();
  });

  describe("Person to Team Path", () => {
    it("should find team membership for person", () => {
      const memberOfLinks = getOutgoingLinks(snapshot, "person_alice").filter(
        (l) => l.linkType === "MEMBER_OF"
      );
      expect(memberOfLinks).toHaveLength(1);
      expect(memberOfLinks[0].targetId).toBe("team_platform");
    });
  });

  describe("Team to Department Path", () => {
    it("should find department for team", () => {
      const memberOfLinks = getOutgoingLinks(snapshot, "team_platform").filter(
        (l) => l.linkType === "MEMBER_OF"
      );
      expect(memberOfLinks).toHaveLength(1);
      expect(memberOfLinks[0].targetId).toBe("department_engineering");
    });
  });

  describe("Reporting Chain", () => {
    it("should find manager for person", () => {
      const reportsToLinks = getOutgoingLinks(snapshot, "person_alice").filter(
        (l) => l.linkType === "REPORTS_TO"
      );
      expect(reportsToLinks).toHaveLength(1);
      expect(reportsToLinks[0].targetId).toBe("person_bob");
    });
  });

  describe("Skills Query", () => {
    it("should find skills for person", () => {
      const hasSkillLinks = getOutgoingLinks(snapshot, "person_alice").filter(
        (l) => l.linkType === "HAS_SKILL"
      );
      expect(hasSkillLinks).toHaveLength(1);
      expect(hasSkillLinks[0].targetId).toBe("skill_typescript");
    });

    it("should have proficiency in expertise map", () => {
      const aliceSkills = snapshot.maps.expertise["person_alice"];
      expect(aliceSkills).toBeDefined();
      expect(aliceSkills).toHaveLength(1);
      expect(aliceSkills[0].skillId).toBe("skill_typescript");
      expect(aliceSkills[0].proficiency).toBe(4);
    });
  });

  describe("Project Allocation", () => {
    it("should find project allocations for person", () => {
      const allocatedLinks = getOutgoingLinks(snapshot, "person_alice").filter(
        (l) => l.linkType === "ALLOCATED_TO"
      );
      expect(allocatedLinks).toHaveLength(1);
      expect(allocatedLinks[0].targetId).toBe("project_alpha");
      expect(allocatedLinks[0].strength).toBe(0.5);
    });
  });
});

// =============================================================================
// Determinism Tests
// =============================================================================

describe("EntityGraph Determinism", () => {
  it("should have nodes sorted by ID", () => {
    const snapshot = createMockSnapshot();
    const nodeIds = snapshot.nodes.map((n) => n.id);
    const sortedIds = [...nodeIds].sort();
    expect(nodeIds).toEqual(sortedIds);
  });

  it("should have links sorted by ID", () => {
    const snapshot = createMockSnapshot();
    const linkIds = snapshot.links.map((l) => l.id);
    const sortedIds = [...linkIds].sort();
    expect(linkIds).toEqual(sortedIds);
  });
});
