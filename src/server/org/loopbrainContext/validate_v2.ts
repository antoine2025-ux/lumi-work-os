import type { LoopbrainOrgContextV2 } from "./types_v2";

/**
 * Validates LoopbrainOrgContext v2 payload structure and invariants.
 * 
 * For now, v2 validation is minimal since v2 mirrors v1 structure.
 * Once v2 diverges, add strict validation mirroring v1's approach.
 * 
 * Throws an Error if validation fails.
 */
export function validateLoopbrainOrgContextV2(c: LoopbrainOrgContextV2) {
  // For now, v2 validation can be permissive until v2 shape is defined.
  // Once v2 diverges, add strict validation mirroring v1's approach.
  if (!c || typeof c !== "object") {
    throw new Error("LoopbrainOrgContext v2 must be an object");
  }
  if (c.version !== "v2") {
    throw new Error("LoopbrainOrgContext v2 must have version 'v2'");
  }
  if (typeof c.generatedAt !== "string") {
    throw new Error("LoopbrainOrgContext v2 must have generatedAt");
  }
}

