/**
 * Phase H: Work Effort Defaults
 * 
 * Handles T-shirt size to hours conversion with workspace-configurable defaults.
 */

import { prisma } from "@/lib/db";
import type { TShirtSize, WorkRequest, WorkEffortDefaults } from "@prisma/client";

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_EFFORT_HOURS: Record<TShirtSize, number> = {
  XS: 4,
  S: 8,
  M: 16,
  L: 32,
  XL: 64,
};

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get effort defaults for a workspace
 * Returns defaults from DB or code defaults if not configured
 */
export async function getWorkspaceEffortDefaults(
  workspaceId: string
): Promise<WorkEffortDefaults | null> {
  return prisma.workEffortDefaults.findUnique({
    where: { workspaceId },
  });
}

/**
 * Get or create effort defaults for a workspace
 */
export async function getOrCreateWorkspaceEffortDefaults(
  workspaceId: string
): Promise<WorkEffortDefaults> {
  const existing = await prisma.workEffortDefaults.findUnique({
    where: { workspaceId },
  });

  if (existing) return existing;

  // Create with code defaults
  return prisma.workEffortDefaults.create({
    data: {
      workspaceId,
      xsHours: DEFAULT_EFFORT_HOURS.XS,
      sHours: DEFAULT_EFFORT_HOURS.S,
      mHours: DEFAULT_EFFORT_HOURS.M,
      lHours: DEFAULT_EFFORT_HOURS.L,
      xlHours: DEFAULT_EFFORT_HOURS.XL,
    },
  });
}

/**
 * Update effort defaults for a workspace
 */
export async function updateWorkspaceEffortDefaults(
  workspaceId: string,
  updates: Partial<{
    xsHours: number;
    sHours: number;
    mHours: number;
    lHours: number;
    xlHours: number;
  }>
): Promise<WorkEffortDefaults> {
  return prisma.workEffortDefaults.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      xsHours: updates.xsHours ?? DEFAULT_EFFORT_HOURS.XS,
      sHours: updates.sHours ?? DEFAULT_EFFORT_HOURS.S,
      mHours: updates.mHours ?? DEFAULT_EFFORT_HOURS.M,
      lHours: updates.lHours ?? DEFAULT_EFFORT_HOURS.L,
      xlHours: updates.xlHours ?? DEFAULT_EFFORT_HOURS.XL,
    },
    update: updates,
  });
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Get T-shirt to hours mapping from workspace defaults
 */
export function getTShirtToHoursMapping(
  defaults: WorkEffortDefaults | null
): Record<TShirtSize, number> {
  if (!defaults) return DEFAULT_EFFORT_HOURS;

  return {
    XS: defaults.xsHours,
    S: defaults.sHours,
    M: defaults.mHours,
    L: defaults.lHours,
    XL: defaults.xlHours,
  };
}

/**
 * Convert T-shirt size to hours
 */
export function tshirtToHours(
  size: TShirtSize,
  defaults: WorkEffortDefaults | null
): number {
  const mapping = getTShirtToHoursMapping(defaults);
  return mapping[size];
}

/**
 * Get estimated effort hours from a work request
 * 
 * Deterministic conversion based on workspace defaults.
 */
export function getEstimatedEffortHours(
  request: Pick<WorkRequest, "effortType" | "effortHours" | "effortTShirt">,
  defaults: WorkEffortDefaults | null
): number {
  if (request.effortType === "HOURS") {
    return request.effortHours ?? 0;
  }

  if (request.effortType === "TSHIRT" && request.effortTShirt) {
    return tshirtToHours(request.effortTShirt, defaults);
  }

  return 0;
}

/**
 * Get effort defaults as serializable object (for API responses)
 */
export function serializeEffortDefaults(
  defaults: WorkEffortDefaults | null
): Record<TShirtSize, number> {
  return getTShirtToHoursMapping(defaults);
}
