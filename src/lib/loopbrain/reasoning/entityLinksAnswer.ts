/**
 * Entity Links Answer Formatter
 *
 * Pure function: EntityGraphSnapshotV0 → LoopbrainAnswerEnvelopeV0
 * No DB calls. Fully testable.
 *
 * Also provides context enrichment: entity graph data feeds into other
 * Loopbrain pipelines as supplementary context (not a direct user answer).
 *
 * @see src/lib/loopbrain/contract/entityLinks.v0.ts
 * @see src/lib/loopbrain/contract/answer-envelope.v0.ts
 */

import type {
  LoopbrainAnswerEnvelopeV0,
  EvidenceValue,
} from "../contract/answer-envelope.v0";
import type {
  EntityGraphSnapshotV0,
} from "../contract/entityLinks.v0";
import {
  ENTITY_GRAPH_PATHS_V0,
  getOutgoingLinks,
  getIncomingLinks,
  findNodeById,
} from "../contract/entityLinks.v0";

// =============================================================================
// Public API
// =============================================================================

/**
 * Format an EntityGraphSnapshotV0 into a LoopbrainAnswerEnvelopeV0.
 *
 * Used when user asks "who works on X?" or "what does person Y do?".
 * For context enrichment (non-user-facing), use extractEntityContext instead.
 */
export function formatEntityLinksEnvelope(
  snapshot: EntityGraphSnapshotV0,
  questionId: string,
  focusEntityId?: string
): LoopbrainAnswerEnvelopeV0 {
  const evidence = buildEvidence(snapshot, focusEntityId);
  const confidence = computeConfidence(snapshot);
  const summary = buildSummary(snapshot, focusEntityId);
  const details = buildDetails(snapshot, focusEntityId);
  const actions = buildRecommendedActions(snapshot, focusEntityId);
  const warnings = buildWarnings(snapshot);

  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    questionId,
    answerability: "ANSWERABLE",
    answer: {
      summary,
      details: details.length > 0 ? details : undefined,
    },
    confidence,
    supportingEvidence: evidence,
    blockingFactors: [],
    recommendedNextActions: actions,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Extract entity context for enriching other Loopbrain pipelines.
 *
 * Returns a structured context summary for a specific entity,
 * suitable for injecting into LLM system prompts.
 */
export function extractEntityContext(
  snapshot: EntityGraphSnapshotV0,
  entityId: string
): EntityContextSummary | null {
  const node = findNodeById(snapshot, entityId);
  if (!node) return null;

  const outgoing = getOutgoingLinks(snapshot, entityId);
  const incoming = getIncomingLinks(snapshot, entityId);

  const connections: EntityConnection[] = [];

  for (const link of outgoing) {
    const target = findNodeById(snapshot, link.targetId);
    if (target) {
      connections.push({
        entityId: target.id,
        entityType: target.entityType,
        label: target.label,
        relationship: link.linkType,
        direction: "outgoing",
        strength: link.strength,
      });
    }
  }

  for (const link of incoming) {
    const source = findNodeById(snapshot, link.sourceId);
    if (source) {
      connections.push({
        entityId: source.id,
        entityType: source.entityType,
        label: source.label,
        relationship: link.linkType,
        direction: "incoming",
        strength: link.strength,
      });
    }
  }

  // Build expertise summary if person
  const expertise =
    node.entityType === "PERSON"
      ? snapshot.maps.expertise[entityId] || []
      : [];

  // Build capacity summary if person
  const capacity =
    node.entityType === "PERSON"
      ? snapshot.maps.capacity[entityId] || null
      : null;

  return {
    entity: {
      id: node.id,
      type: node.entityType,
      label: node.label,
      metadata: node.metadata,
    },
    connections,
    expertise,
    capacity,
    connectionCount: connections.length,
  };
}

// =============================================================================
// Types for Context Enrichment
// =============================================================================

export interface EntityConnection {
  entityId: string;
  entityType: string;
  label: string;
  relationship: string;
  direction: "outgoing" | "incoming";
  strength: number;
}

export interface EntityContextSummary {
  entity: {
    id: string;
    type: string;
    label: string;
    metadata: Record<string, string | number | boolean | null>;
  };
  connections: EntityConnection[];
  expertise: { skillId: string; proficiency: number }[];
  capacity: {
    weeklyHours: number;
    allocatedPct: number;
    availablePct: number;
  } | null;
  connectionCount: number;
}

// =============================================================================
// Internal Helpers
// =============================================================================

function buildEvidence(
  snapshot: EntityGraphSnapshotV0,
  focusEntityId?: string
): { path: string; value: EvidenceValue }[] {
  const evidence: { path: string; value: EvidenceValue }[] = [];

  evidence.push({
    path: ENTITY_GRAPH_PATHS_V0.NODE_COUNT,
    value: snapshot.summary.nodeCount,
  });
  evidence.push({
    path: ENTITY_GRAPH_PATHS_V0.LINK_COUNT,
    value: snapshot.summary.linkCount,
  });

  // Links by type summary
  if (snapshot.summary.linksByType) {
    const byTypeFlat: Record<string, number> = {};
    for (const [k, v] of Object.entries(snapshot.summary.linksByType)) {
      if (v !== undefined) byTypeFlat[k] = v;
    }
    if (Object.keys(byTypeFlat).length > 0) {
      evidence.push({
        path: ENTITY_GRAPH_PATHS_V0.LINKS_BY_TYPE,
        value: byTypeFlat as EvidenceValue,
      });
    }
  }

  // Focus entity connections
  if (focusEntityId) {
    const outgoing = getOutgoingLinks(snapshot, focusEntityId);
    const incoming = getIncomingLinks(snapshot, focusEntityId);
    evidence.push({
      path: "summary.focusEntityConnections",
      value: outgoing.length + incoming.length,
    });
  }

  return evidence;
}

function computeConfidence(snapshot: EntityGraphSnapshotV0): number {
  let confidence = 0.6;

  if (snapshot.summary.nodeCount >= 5) confidence += 0.1;
  if (snapshot.summary.linkCount >= 5) confidence += 0.1;

  // Expertise data enriches
  if (Object.keys(snapshot.maps.expertise).length > 0) {
    confidence += 0.05;
  }

  // Capacity data enriches
  if (Object.keys(snapshot.maps.capacity).length > 0) {
    confidence += 0.05;
  }

  return Math.min(confidence, 0.95);
}

function buildSummary(
  snapshot: EntityGraphSnapshotV0,
  focusEntityId?: string
): string {
  if (focusEntityId) {
    const node = findNodeById(snapshot, focusEntityId);
    if (node) {
      const outgoing = getOutgoingLinks(snapshot, focusEntityId);
      const incoming = getIncomingLinks(snapshot, focusEntityId);
      const totalConnections = outgoing.length + incoming.length;

      return `${node.label} (${node.entityType.toLowerCase()}) has ${totalConnections} connection${totalConnections !== 1 ? "s" : ""} in the org graph.`;
    }
  }

  const { nodeCount, linkCount, linksByType } = snapshot.summary;
  const typeStr = linksByType
    ? Object.entries(linksByType)
        .filter(([, v]) => v && v > 0)
        .map(([k, v]) => `${v} ${k.toLowerCase().replace(/_/g, " ")}`)
        .slice(0, 3)
        .join(", ")
    : "";

  return `Entity graph contains ${nodeCount} nodes and ${linkCount} links${typeStr ? ` (${typeStr})` : ""}.`;
}

function buildDetails(
  snapshot: EntityGraphSnapshotV0,
  focusEntityId?: string
): string[] {
  const details: string[] = [];

  if (focusEntityId) {
    const node = findNodeById(snapshot, focusEntityId);
    if (!node) return details;

    const outgoing = getOutgoingLinks(snapshot, focusEntityId);
    const incoming = getIncomingLinks(snapshot, focusEntityId);

    // Group connections by type
    const byType = new Map<string, string[]>();
    for (const link of outgoing) {
      const target = findNodeById(snapshot, link.targetId);
      if (!target) continue;
      const key = link.linkType;
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key)!.push(target.label);
    }
    for (const link of incoming) {
      const source = findNodeById(snapshot, link.sourceId);
      if (!source) continue;
      const key = `${link.linkType} (incoming)`;
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key)!.push(source.label);
    }

    for (const [type, labels] of byType) {
      const typeName = type.toLowerCase().replace(/_/g, " ");
      details.push(`${typeName}: ${labels.join(", ")}`);
    }

    // Add expertise
    const expertise = snapshot.maps.expertise[focusEntityId];
    if (expertise && expertise.length > 0) {
      details.push(
        `Skills: ${expertise.map((s) => s.skillId.replace("skill_", "")).join(", ")}`
      );
    }

    // Add capacity
    const capacity = snapshot.maps.capacity[focusEntityId];
    if (capacity) {
      details.push(
        `Capacity: ${capacity.weeklyHours}h/week, ${Math.round(capacity.allocatedPct * 100)}% allocated, ${Math.round(capacity.availablePct * 100)}% available`
      );
    }
  } else {
    // General graph summary
    if (snapshot.summary.nodesByType) {
      for (const [type, count] of Object.entries(snapshot.summary.nodesByType)) {
        if (count && count > 0) {
          details.push(
            `${count} ${type.toLowerCase().replace(/_/g, " ")}${count !== 1 ? "s" : ""}`
          );
        }
      }
    }
  }

  return details;
}

function buildRecommendedActions(
  snapshot: EntityGraphSnapshotV0,
  focusEntityId?: string
): { label: string; deepLink?: string }[] {
  const actions: { label: string; deepLink?: string }[] = [];

  if (snapshot.summary.nodeCount === 0) {
    actions.push({
      label: "Set up org structure",
      deepLink: "/org/structure",
    });
    return actions;
  }

  if (focusEntityId) {
    const node = findNodeById(snapshot, focusEntityId);
    if (node?.entityType === "PERSON") {
      actions.push({
        label: `View ${node.label}'s profile`,
        deepLink: "/org/directory",
      });
    }
    if (node?.entityType === "PROJECT") {
      actions.push({
        label: `View ${node.label}`,
        deepLink: "/projects",
      });
    }
  }

  // Dependency chains might indicate risk
  const chainCount = Object.keys(snapshot.maps.dependencyChains).length;
  if (chainCount > 0) {
    actions.push({
      label: `Review ${chainCount} dependency chain${chainCount !== 1 ? "s" : ""}`,
      deepLink: "/org/structure",
    });
  }

  return actions.slice(0, 4);
}

function buildWarnings(snapshot: EntityGraphSnapshotV0): string[] {
  const warnings: string[] = [];

  if (snapshot.summary.nodeCount === 0) {
    warnings.push("Entity graph is empty — no organizational data available.");
  }

  if (Object.keys(snapshot.maps.capacity).length === 0) {
    warnings.push("No capacity data in graph — capacity insights unavailable.");
  }

  return warnings;
}
