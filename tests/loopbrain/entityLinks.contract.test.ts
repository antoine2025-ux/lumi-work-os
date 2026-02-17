/**
 * Entity Links Contract Tests
 *
 * A. ANSWERABLE envelope validates against JSON schema
 * B. Evidence paths align with ENTITY_GRAPH_PATHS_V0
 * C. Focus entity envelope includes connections
 * D. Empty graph produces valid but warned envelope
 * E. Context extraction works for person and project
 * F. No infinite loops on circular relationships
 * G. Confidence invariants hold
 */

import { describe, it, expect } from "vitest";
import {
  formatEntityLinksEnvelope,
  extractEntityContext,
} from "@/lib/loopbrain/reasoning/entityLinksAnswer";
import { validateAnswerEnvelopeV0 } from "@/lib/loopbrain/contract/validateAnswerEnvelope";
import { ENTITY_GRAPH_PATHS_V0 } from "@/lib/loopbrain/contract/entityLinks.v0";
import type { EntityGraphSnapshotV0 } from "@/lib/loopbrain/contract/entityLinks.v0";
import { isEvidencePathAllowed } from "./answer-envelope.contract.test";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeGraphSnapshot(
  overrides: Partial<EntityGraphSnapshotV0> = {}
): EntityGraphSnapshotV0 {
  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    workspaceId: "ws-1",
    nodes: [
      {
        id: "person_alice",
        entityType: "PERSON",
        label: "Alice Smith",
        metadata: { email: "alice@example.com", title: "Senior Engineer" },
      },
      {
        id: "person_bob",
        entityType: "PERSON",
        label: "Bob Jones",
        metadata: { email: "bob@example.com", title: "Engineering Manager" },
      },
      {
        id: "team_platform",
        entityType: "TEAM",
        label: "Platform",
        metadata: {},
      },
      {
        id: "project_alpha",
        entityType: "PROJECT",
        label: "Project Alpha",
        metadata: {},
      },
      {
        id: "skill_typescript",
        entityType: "SKILL",
        label: "TypeScript",
        metadata: {},
      },
      {
        id: "department_engineering",
        entityType: "DEPARTMENT",
        label: "Engineering",
        metadata: {},
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
        sourceId: "person_alice",
        targetId: "person_bob",
        linkType: "REPORTS_TO",
        strength: 1.0,
      },
      {
        id: "link_3",
        sourceId: "person_alice",
        targetId: "project_alpha",
        linkType: "ALLOCATED_TO",
        strength: 0.8,
      },
      {
        id: "link_4",
        sourceId: "person_alice",
        targetId: "skill_typescript",
        linkType: "HAS_SKILL",
        strength: 0.9,
      },
      {
        id: "link_5",
        sourceId: "person_bob",
        targetId: "team_platform",
        linkType: "LEADS",
        strength: 1.0,
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
          allocatedPct: 0.8,
          availablePct: 0.2,
        },
        person_bob: {
          weeklyHours: 40,
          allocatedPct: 0.6,
          availablePct: 0.4,
        },
      },
      dependencyChains: {},
    },
    summary: {
      nodeCount: 6,
      linkCount: 6,
      linksByType: {
        MEMBER_OF: 2,
        REPORTS_TO: 1,
        ALLOCATED_TO: 1,
        HAS_SKILL: 1,
        LEADS: 1,
      },
      nodesByType: {
        PERSON: 2,
        TEAM: 1,
        PROJECT: 1,
        SKILL: 1,
        DEPARTMENT: 1,
      },
    },
    ...overrides,
  };
}

function makeEmptyGraph(): EntityGraphSnapshotV0 {
  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    workspaceId: "ws-1",
    nodes: [],
    links: [],
    maps: { expertise: {}, capacity: {}, dependencyChains: {} },
    summary: { nodeCount: 0, linkCount: 0, linksByType: {} },
  };
}

function makeCircularGraph(): EntityGraphSnapshotV0 {
  return makeGraphSnapshot({
    nodes: [
      {
        id: "person_a",
        entityType: "PERSON",
        label: "Person A",
        metadata: {},
      },
      {
        id: "team_x",
        entityType: "TEAM",
        label: "Team X",
        metadata: {},
      },
      {
        id: "person_b",
        entityType: "PERSON",
        label: "Person B",
        metadata: {},
      },
    ],
    links: [
      {
        id: "link_1",
        sourceId: "person_a",
        targetId: "team_x",
        linkType: "MEMBER_OF",
        strength: 1.0,
      },
      {
        id: "link_2",
        sourceId: "person_b",
        targetId: "team_x",
        linkType: "MEMBER_OF",
        strength: 1.0,
      },
      {
        id: "link_3",
        sourceId: "person_a",
        targetId: "person_b",
        linkType: "REPORTS_TO",
        strength: 1.0,
      },
      {
        id: "link_4",
        sourceId: "person_b",
        targetId: "person_a",
        linkType: "BACKS_UP",
        strength: 0.5,
      },
    ],
    maps: { expertise: {}, capacity: {}, dependencyChains: {} },
    summary: {
      nodeCount: 3,
      linkCount: 4,
      linksByType: { MEMBER_OF: 2, REPORTS_TO: 1, BACKS_UP: 1 },
    },
  });
}

// ---------------------------------------------------------------------------
// A. Valid ANSWERABLE Envelope
// ---------------------------------------------------------------------------

describe("Entity Links — ANSWERABLE Envelope", () => {
  const snapshot = makeGraphSnapshot();
  const envelope = formatEntityLinksEnvelope(
    snapshot,
    "entity-connections"
  );

  it("validates against JSON schema", () => {
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.errors).toHaveLength(0);
  });

  it("has answerability ANSWERABLE", () => {
    expect(envelope.answerability).toBe("ANSWERABLE");
  });

  it("has non-null answer with summary", () => {
    expect(envelope.answer).not.toBeNull();
    expect(envelope.answer!.summary.length).toBeGreaterThan(0);
  });

  it("has confidence >= 0.4", () => {
    expect(envelope.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it("has non-empty supportingEvidence", () => {
    expect(envelope.supportingEvidence.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// B. Evidence Path Alignment
// ---------------------------------------------------------------------------

describe("Entity Links — Evidence Path Alignment", () => {
  const snapshot = makeGraphSnapshot();
  const envelope = formatEntityLinksEnvelope(
    snapshot,
    "entity-connections"
  );
  const allowedPaths = [
    ...Object.values(ENTITY_GRAPH_PATHS_V0),
    "summary.focusEntityConnections",
  ];

  it("every evidence path is allowed by ENTITY_GRAPH_PATHS_V0 or summary prefix", () => {
    for (const ev of envelope.supportingEvidence) {
      const allowed = isEvidencePathAllowed(ev.path, allowedPaths);
      expect(allowed).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// C. Focus Entity Envelope
// ---------------------------------------------------------------------------

describe("Entity Links — Focus Entity", () => {
  const snapshot = makeGraphSnapshot();
  const envelope = formatEntityLinksEnvelope(
    snapshot,
    "entity-connections",
    "person_alice"
  );

  it("validates against JSON schema", () => {
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
  });

  it("summary mentions the focused entity name", () => {
    expect(envelope.answer!.summary).toContain("Alice Smith");
  });

  it("summary mentions connection count", () => {
    // Alice has 4 outgoing links
    expect(envelope.answer!.summary).toContain("4 connection");
  });

  it("details include relationship types", () => {
    expect(envelope.answer!.details).toBeDefined();
    expect(envelope.answer!.details!.length).toBeGreaterThan(0);
  });

  it("details include skills when person has expertise", () => {
    expect(
      envelope.answer!.details!.some((d) =>
        d.toLowerCase().includes("skill")
      )
    ).toBe(true);
  });

  it("details include capacity when person has capacity data", () => {
    expect(
      envelope.answer!.details!.some((d) =>
        d.toLowerCase().includes("capacity")
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D. Empty Graph
// ---------------------------------------------------------------------------

describe("Entity Links — Empty Graph", () => {
  const snapshot = makeEmptyGraph();
  const envelope = formatEntityLinksEnvelope(
    snapshot,
    "entity-connections"
  );

  it("validates against JSON schema", () => {
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
  });

  it("has warnings about empty graph", () => {
    expect(envelope.warnings).toBeDefined();
    expect(
      envelope.warnings!.some((w) => w.toLowerCase().includes("empty"))
    ).toBe(true);
  });

  it("recommends setting up org structure", () => {
    const labels = envelope.recommendedNextActions.map((a) =>
      a.label.toLowerCase()
    );
    expect(labels.some((l) => l.includes("org structure"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// E. Context Extraction
// ---------------------------------------------------------------------------

describe("Entity Links — Context Extraction", () => {
  const snapshot = makeGraphSnapshot();

  it("extracts person context with connections", () => {
    const ctx = extractEntityContext(snapshot, "person_alice");
    expect(ctx).not.toBeNull();
    expect(ctx!.entity.label).toBe("Alice Smith");
    expect(ctx!.connections.length).toBeGreaterThan(0);
  });

  it("person context includes team connection", () => {
    const ctx = extractEntityContext(snapshot, "person_alice");
    const teamConn = ctx!.connections.find(
      (c) => c.entityType === "TEAM"
    );
    expect(teamConn).toBeDefined();
    expect(teamConn!.label).toBe("Platform");
  });

  it("person context includes expertise", () => {
    const ctx = extractEntityContext(snapshot, "person_alice");
    expect(ctx!.expertise.length).toBeGreaterThan(0);
    expect(ctx!.expertise[0].skillId).toBe("skill_typescript");
  });

  it("person context includes capacity", () => {
    const ctx = extractEntityContext(snapshot, "person_alice");
    expect(ctx!.capacity).not.toBeNull();
    expect(ctx!.capacity!.weeklyHours).toBe(40);
  });

  it("returns null for non-existent entity", () => {
    const ctx = extractEntityContext(snapshot, "nonexistent_id");
    expect(ctx).toBeNull();
  });

  it("project context includes incoming allocated links", () => {
    const ctx = extractEntityContext(snapshot, "project_alpha");
    expect(ctx).not.toBeNull();
    const incoming = ctx!.connections.filter(
      (c) => c.direction === "incoming"
    );
    expect(incoming.length).toBeGreaterThan(0);
    expect(incoming[0].label).toBe("Alice Smith");
  });
});

// ---------------------------------------------------------------------------
// F. Circular Relationships
// ---------------------------------------------------------------------------

describe("Entity Links — Circular Relationships", () => {
  const snapshot = makeCircularGraph();

  it("context extraction handles circular links without infinite loop", () => {
    const ctxA = extractEntityContext(snapshot, "person_a");
    expect(ctxA).not.toBeNull();
    expect(ctxA!.connections.length).toBeGreaterThan(0);

    const ctxB = extractEntityContext(snapshot, "person_b");
    expect(ctxB).not.toBeNull();
    expect(ctxB!.connections.length).toBeGreaterThan(0);
  });

  it("envelope formats correctly with circular graph", () => {
    const envelope = formatEntityLinksEnvelope(
      snapshot,
      "entity-connections",
      "person_a"
    );
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// G. Confidence Invariants
// ---------------------------------------------------------------------------

describe("Entity Links — Confidence", () => {
  it("graph with many nodes has higher confidence", () => {
    const snapshot = makeGraphSnapshot();
    const envelope = formatEntityLinksEnvelope(
      snapshot,
      "entity-connections"
    );
    expect(envelope.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("empty graph has lower confidence", () => {
    const snapshot = makeEmptyGraph();
    const envelope = formatEntityLinksEnvelope(
      snapshot,
      "entity-connections"
    );
    expect(envelope.confidence).toBeLessThan(0.7);
  });

  it("confidence is between 0.4 and 0.95", () => {
    const snapshot = makeGraphSnapshot();
    const envelope = formatEntityLinksEnvelope(
      snapshot,
      "entity-connections"
    );
    expect(envelope.confidence).toBeGreaterThanOrEqual(0.4);
    expect(envelope.confidence).toBeLessThanOrEqual(0.95);
  });
});
