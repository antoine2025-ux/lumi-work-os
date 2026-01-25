/**
 * Canonical Explainability Schema
 *
 * Structured explainability contract for all derived signals, issues, recommendations, and UI changes.
 * Answers three questions consistently everywhere:
 * 1. Why does this exist?
 * 2. What does it depend on?
 * 3. What changes would remove or change it?
 *
 * Core Principle: Explainability is a first-class contract, not a UI affordance.
 * - Explanations are structured
 * - They are resolver-owned
 * - UI never invents reasoning
 * - All surfaces render from the same schema
 */

export type ExplainabilityBlock = {
  blockId: string; // Stable identifier (e.g. issueKey or `${workRequestId}:feasibility`)
  kind?: "ISSUE" | "FEASIBILITY" | "IMPACT" | "DECISION" | "CAPACITY"; // Optional: for UI rendering variations
  why: string[]; // Why this exists
  dependsOn: ExplainDependency[];
  whatChangesIt: string[]; // What fixes or alters it
};

export type ExplainDependency = {
  type: "DATA" | "RULE" | "CONFIG" | "TIME_WINDOW";
  label: string; // Human-readable
  reference?: string; // Optional key/id (teamId, ruleId, etc.)
  // reference format: stable identifier only (teamId, personId, workRequestId, domainKey, issueKey, or `${start}/${end}` for windows)
  // Never use human labels in reference
};

export type ExplainabilityMeta = {
  semanticsVersion: number;
  evidenceVersion: number;
  assumptionsId: string;
};

/**
 * blockId stability rules:
 * - For issues: blockId = issueKey
 * - For feasibility: blockId = ${workRequestId}:feasibility
 * - For impact resolution: blockId = ${workRequestId}:impact
 * - For decision resolution: blockId = ${domainKey}:decision
 * - For capacity: blockId = ${personId}:capacity:${windowStart}/${windowEnd} (or stable window label)
 *
 * This prevents jitter and accidental re-mounts.
 */
