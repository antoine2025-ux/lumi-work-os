// src/lib/org/context/index.ts

/**
 * Org Context Helpers
 * 
 * Central export point for Org context building utilities.
 * These helpers transform Org models (RoleCard, OrgPosition, etc.)
 * into unified context representations for Loopbrain.
 */

export * from "./roleContextTypes";
export * from "./roleId";
export * from "./buildRoleContext";
export * from "./buildRoleContextsFromWorkspace";
export * from "./mapRoleContextToContextObject";
// (Later we'll add persistence helpers here)

