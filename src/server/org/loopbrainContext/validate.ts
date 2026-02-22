import type { LoopbrainOrgContext } from "./types";

function isObj(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`LoopbrainOrgContext validation failed: ${msg}`);
}

function assertString(x: unknown, path: string) {
  assert(typeof x === "string" && x.length > 0, `Expected string at ${path}`);
}

function assertBool(x: unknown, path: string) {
  assert(typeof x === "boolean", `Expected boolean at ${path}`);
}

function assertNumber(x: unknown, path: string) {
  assert(typeof x === "number" && Number.isFinite(x) && !Number.isNaN(x), `Expected number at ${path}`);
}

function assertArray(x: unknown, path: string) {
  assert(Array.isArray(x), `Expected array at ${path}`);
}

/**
 * Validates LoopbrainOrgContext v1 payload structure and invariants.
 *
 * This validates:
 * - Shape (required fields, types)
 * - Invariants (logical constraints)
 *
 * It does NOT validate:
 * - Schema existence (tables exist)
 * - Data correctness (counts match reality)
 *
 * Throws an Error if validation fails.
 */
export function validateLoopbrainOrgContextV1(c: LoopbrainOrgContext) {
  assert(isObj(c), "context must be an object");

  assertString(c.generatedAt, "context.generatedAt");
  assertString(c.version, "context.version");
  assert(c.version === "v1", "context.version must be 'v1'");

  // readiness
  assert(isObj(c.readiness), "context.readiness must be object");
  assertBool(c.readiness.ready, "context.readiness.ready");
  assertArray(c.readiness.items, "context.readiness.items");

  for (const item of c.readiness.items) {
    assert(isObj(item), "readiness.items[] must be object");
    assertString(item.key, "readiness.items[].key");
    assertBool(item.complete, "readiness.items[].complete");
    assert(isObj(item.meta), "readiness.items[].meta must be object");
  }

  // orgCounts
  assert(isObj(c.orgCounts), "context.orgCounts must be object");
  for (const k of [
    "people",
    "teams",
    "departments",
    "unownedEntities",
    "missingManagers",
    "availabilityUnknown",
    "availabilityStale",
  ] as const) {
    assertNumber(c.orgCounts[k], `context.orgCounts.${k}`);
  }

  // intelligence
  assert(isObj(c.intelligence), "context.intelligence must be object");
  assert("snapshot" in c.intelligence, "context.intelligence.snapshot must exist (can be null)");
  assert("rollups" in c.intelligence, "context.intelligence.rollups must exist (can be null)");
  assertArray(c.intelligence.topFindings, "context.intelligence.topFindings");

  // recommendations
  assert(isObj(c.recommendations), "context.recommendations must be object");
  assert("snapshot" in c.recommendations, "context.recommendations.snapshot must exist (can be null)");
  assertArray(c.recommendations.topActions, "context.recommendations.topActions");

  // freshness
  assert(isObj(c.freshness), "context.freshness must be object");
  const { intelligenceSnapshot } = c.freshness;
  assert(isObj(intelligenceSnapshot), "context.freshness.intelligenceSnapshot must be object");
  assert(typeof intelligenceSnapshot.status === "string", "freshness.intelligenceSnapshot.status must be string");
  assert(
    ["MISSING", "FRESH", "STALE", "OUTDATED"].includes(intelligenceSnapshot.status),
    "freshness.intelligenceSnapshot.status must be one of: MISSING, FRESH, STALE, OUTDATED",
  );
  assert(isObj(intelligenceSnapshot.policy), "freshness.intelligenceSnapshot.policy must be object");
  assertNumber(intelligenceSnapshot.policy.freshMinutes, "freshness.intelligenceSnapshot.policy.freshMinutes");
  assertNumber(intelligenceSnapshot.policy.warnMinutes, "freshness.intelligenceSnapshot.policy.warnMinutes");

  // Invariants
  if (c.orgCounts.people === 0) {
    assert(c.readiness.ready === false, "If orgCounts.people == 0, readiness.ready must be false");
  }
  assert(
    c.orgCounts.missingManagers <= c.orgCounts.people,
    "missingManagers must be <= people"
  );
}
