/**
 * Phase J: Impact & Dependency Graph
 *
 * Public exports for the impact module.
 */

export * from "./types";
export { getExplicitImpacts, hydrateSubjectLabels } from "./read";
export { inferImpacts } from "./inferImpacts";
export { resolveWorkImpact } from "./resolveWorkImpact";
