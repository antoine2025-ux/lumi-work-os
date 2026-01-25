/**
 * Capacity Resolver
 *
 * Pure function that computes capacity signals from intelligence data.
 * No side effects, no Prisma calls, no writes.
 *
 * PHASE S CONSTRAINTS (DO NOT EXPAND):
 * - No new Prisma fields, joins, or heuristics added for capacity in Phase S
 * - Return stub values only
 * - Emit ONE info-level issue: CAPACITY_NOT_MODELED
 * - Capacity expansion is deferred to a future phase
 *
 * See docs/org/intelligence-rules.md for canonical rules.
 */

import type { IntelligenceData } from "../queries";
import type { CapacitySignals, ExplainableIssue } from "../types";

/**
 * Resolve capacity signals from intelligence data.
 * Pure function: same input produces same output.
 *
 * Phase S: Returns stubs with info-level issue.
 *
 * @param data - Intelligence data from loadIntelligenceData()
 * @returns Capacity signals (stub)
 */
export function resolveCapacitySignals(_data: IntelligenceData): CapacitySignals {
  const issues: ExplainableIssue[] = [];

  // Phase S: Capacity not modeled yet
  issues.push({
    code: "CAPACITY_NOT_MODELED",
    severity: "info",
    title: "Capacity data not available",
    detail: "Role distribution and execution capacity analysis requires additional schema modeling. Deferred to future phase.",
    entities: [],
  });

  return {
    roleDistribution: [],
    teamsWithZeroExecutionCapacity: [],
    issues,
  };
}
