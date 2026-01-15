import type { LoopbrainOrgContext } from "./types";

function isObj(x: any) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`LoopbrainOrgContext validation failed: ${msg}`);
}

function assertString(x: any, path: string) {
  assert(typeof x === "string" && x.length > 0, `Expected string at ${path}`);
}

function assertBool(x: any, path: string) {
  assert(typeof x === "boolean", `Expected boolean at ${path}`);
}

function assertNumber(x: any, path: string) {
  assert(typeof x === "number" && Number.isFinite(x) && !Number.isNaN(x), `Expected number at ${path}`);
}

function assertArray(x: any, path: string) {
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
    assertString((item as any).key, "readiness.items[].key");
    assertBool((item as any).complete, "readiness.items[].complete");
    assert(isObj((item as any).meta), "readiness.items[].meta must be object");
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
    assertNumber((c.orgCounts as any)[k], `context.orgCounts.${k}`);
  }

  // intelligence
  assert(isObj(c.intelligence), "context.intelligence must be object");
  assert("snapshot" in c.intelligence, "context.intelligence.snapshot must exist (can be null)");
  assert("rollups" in c.intelligence, "context.intelligence.rollups must exist (can be null)");
  assertArray((c.intelligence as any).topFindings, "context.intelligence.topFindings");

  // recommendations
  assert(isObj(c.recommendations), "context.recommendations must be object");
  assert("snapshot" in c.recommendations, "context.recommendations.snapshot must exist (can be null)");
  assertArray((c.recommendations as any).topActions, "context.recommendations.topActions");

  // freshness
  assert(isObj(c.freshness), "context.freshness must be object");
  assert(isObj((c.freshness as any).intelligenceSnapshot), "context.freshness.intelligenceSnapshot must be object");
  const freshness = (c.freshness as any).intelligenceSnapshot;
  assert(typeof freshness.status === "string", "freshness.intelligenceSnapshot.status must be string");
  assert(["MISSING", "FRESH", "STALE", "OUTDATED"].includes(freshness.status), "freshness.intelligenceSnapshot.status must be one of: MISSING, FRESH, STALE, OUTDATED");
  assert(isObj(freshness.policy), "freshness.intelligenceSnapshot.policy must be object");
  assertNumber(freshness.policy.freshMinutes, "freshness.intelligenceSnapshot.policy.freshMinutes");
  assertNumber(freshness.policy.warnMinutes, "freshness.intelligenceSnapshot.policy.warnMinutes");

  // Invariants
  if (c.orgCounts.people === 0) {
    assert(c.readiness.ready === false, "If orgCounts.people == 0, readiness.ready must be false");
  }
  assert(
    c.orgCounts.missingManagers <= c.orgCounts.people,
    "missingManagers must be <= people"
  );
}

