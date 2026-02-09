/**
 * Entity Links v0 — Graph-based Entity Relationship Contract
 *
 * Machine contract for Loopbrain reasoning about organizational structure,
 * expertise mapping, and dependency chains. Enables graph traversal queries
 * like "who has skill X?", "what depends on team Y?", "who reports to Z?".
 *
 * Invariants:
 * - All links are directional (source → target)
 * - strength is 0.0–1.0 (1.0 = strongest relationship)
 * - Pre-computed maps are derived from links (not independent data)
 * - Arrays are deterministic-sorted by id for stable hashing
 *
 * Evidence paths for Loopbrain reasoning:
 * - links.byType.{linkType}
 * - maps.expertise.{personId}
 * - maps.capacity.{personId}
 * - maps.dependencyChains.{entityId}
 *
 * @example
 * ```typescript
 * const snapshot: EntityGraphSnapshotV0 = {
 *   schemaVersion: "v0",
 *   generatedAt: new Date().toISOString(),
 *   workspaceId: "ws_123",
 *   nodes: [
 *     { id: "person_1", entityType: "PERSON", label: "Alice", metadata: { title: "Engineer" } },
 *     { id: "team_1", entityType: "TEAM", label: "Platform", metadata: {} },
 *   ],
 *   links: [
 *     { id: "link_1", sourceId: "person_1", targetId: "team_1", linkType: "MEMBER_OF", strength: 1.0 },
 *   ],
 *   maps: {
 *     expertise: { person_1: [{ skillId: "skill_ts", proficiency: 4 }] },
 *     capacity: { person_1: { weeklyHours: 40, allocatedPct: 0.8, availablePct: 0.2 } },
 *     dependencyChains: {},
 *   },
 *   summary: { nodeCount: 2, linkCount: 1, linksByType: { MEMBER_OF: 1 } },
 * };
 * ```
 */

// =============================================================================
// Entity Type Enum
// =============================================================================

/**
 * Entity types in the organizational graph.
 * Append-only; meanings must never change.
 */
export const ENTITY_TYPE_V0 = [
  "PERSON",
  "TEAM",
  "DEPARTMENT",
  "PROJECT",
  "SKILL",
  "ROLE",
  "DECISION_DOMAIN",
  "WORK_REQUEST",
] as const;

export type EntityTypeV0 = (typeof ENTITY_TYPE_V0)[number];

// =============================================================================
// Link Type Enum
// =============================================================================

/**
 * Relationship types between entities.
 * Append-only; meanings must never change.
 *
 * Semantics:
 * - MEMBER_OF: Person belongs to Team/Department
 * - REPORTS_TO: Person reports to another Person (manager)
 * - OWNS: Person/Team owns Department/Project/Domain
 * - DEPENDS_ON: Entity depends on another Entity (blocking relationship)
 * - HAS_SKILL: Person has a Skill
 * - DECIDES_FOR: Person/Role has decision authority for DecisionDomain
 * - ALLOCATED_TO: Person is allocated to Project/Team
 * - LEADS: Person leads a Team/Department
 * - BACKS_UP: Person is backup for another Person's role
 */
export const LINK_TYPE_V0 = [
  "MEMBER_OF",
  "REPORTS_TO",
  "OWNS",
  "DEPENDS_ON",
  "HAS_SKILL",
  "DECIDES_FOR",
  "ALLOCATED_TO",
  "LEADS",
  "BACKS_UP",
] as const;

export type LinkTypeV0 = (typeof LINK_TYPE_V0)[number];

// =============================================================================
// Node Types
// =============================================================================

/**
 * Flat metadata for entity nodes.
 * Must be shallow JSON-serializable primitives only.
 */
export type EntityNodeMetadataV0 = Record<string, string | number | boolean | null>;

/**
 * A node in the entity graph.
 */
export type EntityNodeV0 = {
  /** Unique identifier (e.g., "person_cuid123", "team_cuid456") */
  id: string;
  /** Type of entity */
  entityType: EntityTypeV0;
  /** Human-readable label */
  label: string;
  /** Optional flat metadata (no nested objects) */
  metadata: EntityNodeMetadataV0;
};

// =============================================================================
// Link Types
// =============================================================================

/**
 * Flat metadata for links.
 * Must be shallow JSON-serializable primitives only.
 */
export type EntityLinkMetadataV0 = Record<string, string | number | boolean | null>;

/**
 * A directed edge in the entity graph.
 */
export type EntityLinkV0 = {
  /** Unique identifier for this link */
  id: string;
  /** Source entity ID */
  sourceId: string;
  /** Target entity ID */
  targetId: string;
  /** Type of relationship */
  linkType: LinkTypeV0;
  /**
   * Relationship strength (0.0–1.0).
   * 1.0 = full/primary relationship
   * 0.5 = partial (e.g., 50% allocation)
   * Lower values = weaker association
   */
  strength: number;
  /** Optional flat metadata */
  metadata?: EntityLinkMetadataV0;
};

// =============================================================================
// Pre-computed Maps
// =============================================================================

/**
 * Skill proficiency entry for expertise mapping.
 */
export type SkillProficiencyV0 = {
  /** Skill entity ID */
  skillId: string;
  /** Proficiency level (1–5, where 5 is expert) */
  proficiency: number;
};

/**
 * Capacity summary for a person.
 */
export type PersonCapacitySummaryV0 = {
  /** Weekly contracted hours */
  weeklyHours: number;
  /** Percentage of capacity allocated (0.0–1.0+, can exceed 1.0 if overallocated) */
  allocatedPct: number;
  /** Percentage of capacity available (0.0–1.0, clamped to 0 if overallocated) */
  availablePct: number;
};

/**
 * Pre-computed maps derived from graph links.
 * These are convenience structures for common Loopbrain queries.
 */
export type EntityGraphMapsV0 = {
  /**
   * Person ID → skills with proficiency.
   * Derived from HAS_SKILL links.
   */
  expertise: Record<string, SkillProficiencyV0[]>;

  /**
   * Person ID → capacity summary.
   * Derived from CapacityContract and WorkAllocation data.
   */
  capacity: Record<string, PersonCapacitySummaryV0>;

  /**
   * Entity ID → downstream dependent entity IDs.
   * Derived from DEPENDS_ON links (transitive closure).
   * Used for blast radius analysis.
   */
  dependencyChains: Record<string, string[]>;
};

// =============================================================================
// Graph Summary
// =============================================================================

/**
 * Summary statistics for the entity graph.
 */
export type EntityGraphSummaryV0 = {
  /** Total number of nodes */
  nodeCount: number;
  /** Total number of links */
  linkCount: number;
  /** Count of links by type */
  linksByType: Partial<Record<LinkTypeV0, number>>;
  /** Count of nodes by type */
  nodesByType?: Partial<Record<EntityTypeV0, number>>;
};

// =============================================================================
// Main Snapshot Type
// =============================================================================

/**
 * Entity Graph Snapshot v0 — Full graph state for Loopbrain consumption.
 *
 * This is a machine contract, not a UI model.
 * UI may display snapshot data but never reinterpret or reformat it.
 */
export type EntityGraphSnapshotV0 = {
  /** Schema version for forward compatibility */
  schemaVersion: "v0";
  /** ISO timestamp when snapshot was generated */
  generatedAt: string;
  /** Workspace this snapshot belongs to */
  workspaceId: string;

  /** All entity nodes in the graph (sorted by id) */
  nodes: EntityNodeV0[];
  /** All directed links in the graph (sorted by id) */
  links: EntityLinkV0[];

  /** Pre-computed maps for common queries */
  maps: EntityGraphMapsV0;

  /** Summary statistics */
  summary: EntityGraphSummaryV0;
};

// =============================================================================
// Evidence Paths
// =============================================================================

/**
 * Canonical evidence paths for EntityGraphSnapshotV0.
 * Used by Loopbrain to cite specific data in answers.
 */
export const ENTITY_GRAPH_PATHS_V0 = {
  /** Path to links grouped by type */
  LINKS_BY_TYPE: "links.byType",
  /** Path to expertise map */
  EXPERTISE_MAP: "maps.expertise",
  /** Path to capacity map */
  CAPACITY_MAP: "maps.capacity",
  /** Path to dependency chains */
  DEPENDENCY_CHAINS: "maps.dependencyChains",
  /** Path to summary statistics */
  SUMMARY: "summary",
  /** Path to node count */
  NODE_COUNT: "summary.nodeCount",
  /** Path to link count */
  LINK_COUNT: "summary.linkCount",
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get links of a specific type from the graph.
 */
export function getLinksByType(
  snapshot: EntityGraphSnapshotV0,
  linkType: LinkTypeV0
): EntityLinkV0[] {
  return snapshot.links.filter((link) => link.linkType === linkType);
}

/**
 * Get all nodes of a specific entity type.
 */
export function getNodesByType(
  snapshot: EntityGraphSnapshotV0,
  entityType: EntityTypeV0
): EntityNodeV0[] {
  return snapshot.nodes.filter((node) => node.entityType === entityType);
}

/**
 * Find a node by ID.
 */
export function findNodeById(
  snapshot: EntityGraphSnapshotV0,
  nodeId: string
): EntityNodeV0 | undefined {
  return snapshot.nodes.find((node) => node.id === nodeId);
}

/**
 * Get all links where the given entity is the source.
 */
export function getOutgoingLinks(
  snapshot: EntityGraphSnapshotV0,
  entityId: string
): EntityLinkV0[] {
  return snapshot.links.filter((link) => link.sourceId === entityId);
}

/**
 * Get all links where the given entity is the target.
 */
export function getIncomingLinks(
  snapshot: EntityGraphSnapshotV0,
  entityId: string
): EntityLinkV0[] {
  return snapshot.links.filter((link) => link.targetId === entityId);
}

// =============================================================================
// TODO: Validation
// =============================================================================

// TODO: Add JSON Schema validation similar to validateAnswerEnvelope.ts
// - Validate schemaVersion is "v0"
// - Validate all node IDs are unique
// - Validate all link source/target IDs exist in nodes
// - Validate strength is 0.0–1.0
// - Validate proficiency is 1–5
// - Validate allocatedPct and availablePct are non-negative
