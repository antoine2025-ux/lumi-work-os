/**
 * LoopBrain v1 Signals
 * 
 * Signals are facts emitted from the People modeling surface.
 * They represent gaps, changes, and structural observations that LoopBrain can reason over.
 * 
 * Key principles:
 * - Signals are facts, not opinions
 * - Incomplete data is treated as signal, not error
 * - Signals are append-only (no deduping in v1)
 */

export type LoopBrainSignal =
  | "MISSING_MANAGER"
  | "MISSING_TEAM"
  | "MISSING_ROLE"
  | "ORPHAN_MANAGER"
  | "DUPLICATE_PERSON"
  | "STRUCTURE_CHANGED"
  | "NEW_NODE_CREATED";

export type LoopBrainEvent = {
  type: LoopBrainSignal;
  entityId: string;
  severity: "low" | "medium" | "high";
  context?: Record<string, any>;
  occurredAt: Date;
};

/**
 * Signal severity mapping:
 * - high: Structural gaps that prevent org reasoning (missing manager)
 * - medium: Operational gaps that reduce clarity (missing team)
 * - low: Informational gaps that can be inferred (missing role)
 */

