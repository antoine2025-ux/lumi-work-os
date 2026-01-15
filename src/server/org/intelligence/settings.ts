/**
 * Org Intelligence Settings service.
 * 
 * Manages workspace-scoped intelligence thresholds and configuration.
 * Settings are used by intelligence computations (management load, staleness, etc.).
 */

import { prisma } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/prisma/scopingMiddleware";

export type OrgIntelligenceSettings = {
  mgmtMediumDirectReports: number;
  mgmtHighDirectReports: number;
  availabilityStaleDays: number;
  snapshotFreshMinutes: number;
  snapshotWarnMinutes: number;
  schemaVersion: number;
};

/**
 * Validate intelligence settings before update.
 * Throws an error with a clear message if validation fails.
 */
export function validateIntelligenceSettings(input: {
  mgmtMediumDirectReports: number;
  mgmtHighDirectReports: number;
  availabilityStaleDays: number;
  snapshotFreshMinutes?: number;
  snapshotWarnMinutes?: number;
}): void {
  if (
    !Number.isInteger(input.mgmtMediumDirectReports) ||
    input.mgmtMediumDirectReports < 1
  ) {
    throw new Error("mgmtMediumDirectReports must be an integer >= 1");
  }

  if (
    !Number.isInteger(input.mgmtHighDirectReports) ||
    input.mgmtHighDirectReports <= input.mgmtMediumDirectReports
  ) {
    throw new Error(
      "mgmtHighDirectReports must be an integer greater than mgmtMediumDirectReports"
    );
  }

  if (
    !Number.isInteger(input.availabilityStaleDays) ||
    input.availabilityStaleDays < 1 ||
    input.availabilityStaleDays > 365
  ) {
    throw new Error("availabilityStaleDays must be an integer between 1 and 365");
  }

  // Validate snapshot freshness settings if provided
  if (input.snapshotFreshMinutes !== undefined) {
    if (
      !Number.isInteger(input.snapshotFreshMinutes) ||
      input.snapshotFreshMinutes < 5 ||
      input.snapshotFreshMinutes > 10080
    ) {
      throw new Error("snapshotFreshMinutes must be an integer between 5 and 10080 (7 days)");
    }
  }

  if (input.snapshotWarnMinutes !== undefined) {
    if (
      !Number.isInteger(input.snapshotWarnMinutes) ||
      input.snapshotWarnMinutes < (input.snapshotFreshMinutes ?? 1440) ||
      input.snapshotWarnMinutes > 20160
    ) {
      throw new Error(
        "snapshotWarnMinutes must be an integer between snapshotFreshMinutes and 20160 (14 days)"
      );
    }
  }

  // Cross-validate: warnMinutes must be > freshMinutes
  if (
    input.snapshotFreshMinutes !== undefined &&
    input.snapshotWarnMinutes !== undefined &&
    input.snapshotWarnMinutes <= input.snapshotFreshMinutes
  ) {
    throw new Error("snapshotWarnMinutes must be greater than snapshotFreshMinutes");
  }
}

/**
 * Get or create default intelligence settings for the current workspace.
 * Workspace scoping is applied via setWorkspaceContext.
 */
export async function getOrCreateIntelligenceSettings(): Promise<OrgIntelligenceSettings> {
  // Schema truth: If model/table doesn't exist, Prisma will throw.
  // This enforces that migrations must be applied.
  
  // Check if model exists (prevents "Cannot read properties of undefined" error)
  if (!prisma.orgIntelligenceSettings) {
    throw new Error("Prisma client is stale - please run 'pnpm prisma generate'. The orgIntelligenceSettings model is missing.");
  }
  
  let existing;
  try {
    existing = await prisma.orgIntelligenceSettings.findFirst();
  } catch (error: any) {
    throw error;
  }

  if (existing) {
    return {
      mgmtMediumDirectReports: existing.mgmtMediumDirectReports,
      mgmtHighDirectReports: existing.mgmtHighDirectReports,
      availabilityStaleDays: existing.availabilityStaleDays,
      snapshotFreshMinutes: existing.snapshotFreshMinutes,
      snapshotWarnMinutes: existing.snapshotWarnMinutes,
      schemaVersion: existing.schemaVersion,
    };
  }

  let created;
  try {
    const workspaceId = getWorkspaceContext();
    if (!workspaceId) {
      throw new Error("No workspace context set - cannot create intelligence settings");
    }
    created = await prisma.orgIntelligenceSettings.create({
      data: { workspaceId },
    });
  } catch (error: any) {
    throw error;
  }

  return {
    mgmtMediumDirectReports: created.mgmtMediumDirectReports,
    mgmtHighDirectReports: created.mgmtHighDirectReports,
    availabilityStaleDays: created.availabilityStaleDays,
    snapshotFreshMinutes: created.snapshotFreshMinutes,
    snapshotWarnMinutes: created.snapshotWarnMinutes,
    schemaVersion: created.schemaVersion,
  };
}

/**
 * Update intelligence settings for the current workspace.
 * Workspace scoping is applied via setWorkspaceContext.
 * Validates input before writing.
 */
export async function updateIntelligenceSettings(
  input: Partial<OrgIntelligenceSettings>
): Promise<void> {
  // Schema truth: If model/table doesn't exist, Prisma will throw.
  // This enforces that migrations must be applied.
  
  // Fetch current settings to use for validation if some fields are not provided
  const current = await prisma.orgIntelligenceSettings.findFirst();
  
  const currentWithDefaults = current;

  // Validate if all required fields are present (including snapshot freshness if provided)
  if (
    input.mgmtMediumDirectReports !== undefined &&
    input.mgmtHighDirectReports !== undefined &&
    input.availabilityStaleDays !== undefined
  ) {
    validateIntelligenceSettings({
      mgmtMediumDirectReports: input.mgmtMediumDirectReports,
      mgmtHighDirectReports: input.mgmtHighDirectReports,
      availabilityStaleDays: input.availabilityStaleDays,
      snapshotFreshMinutes: input.snapshotFreshMinutes ?? currentWithDefaults?.snapshotFreshMinutes ?? 1440,
      snapshotWarnMinutes: input.snapshotWarnMinutes ?? currentWithDefaults?.snapshotWarnMinutes ?? 2880,
    });
  } else if (
    input.snapshotFreshMinutes !== undefined ||
    input.snapshotWarnMinutes !== undefined
  ) {
    // Validate snapshot freshness settings even if other fields aren't being updated
    validateIntelligenceSettings({
      mgmtMediumDirectReports: input.mgmtMediumDirectReports ?? (currentWithDefaults?.mgmtMediumDirectReports ?? 1),
      mgmtHighDirectReports: input.mgmtHighDirectReports ?? (currentWithDefaults?.mgmtHighDirectReports ?? 2),
      availabilityStaleDays: input.availabilityStaleDays ?? (currentWithDefaults?.availabilityStaleDays ?? 1),
      snapshotFreshMinutes: input.snapshotFreshMinutes ?? currentWithDefaults?.snapshotFreshMinutes ?? 1440,
      snapshotWarnMinutes: input.snapshotWarnMinutes ?? currentWithDefaults?.snapshotWarnMinutes ?? 2880,
    });
  }

  // Build update data - only include fields that are being updated
  const updateData: {
    mgmtMediumDirectReports?: number;
    mgmtHighDirectReports?: number;
    availabilityStaleDays?: number;
    snapshotFreshMinutes?: number;
    snapshotWarnMinutes?: number;
  } = {};
  if (input.mgmtMediumDirectReports !== undefined) {
    updateData.mgmtMediumDirectReports = input.mgmtMediumDirectReports;
  }
  if (input.mgmtHighDirectReports !== undefined) {
    updateData.mgmtHighDirectReports = input.mgmtHighDirectReports;
  }
  if (input.availabilityStaleDays !== undefined) {
    updateData.availabilityStaleDays = input.availabilityStaleDays;
  }
  if (input.snapshotFreshMinutes !== undefined) {
    updateData.snapshotFreshMinutes = input.snapshotFreshMinutes;
  }
  if (input.snapshotWarnMinutes !== undefined) {
    updateData.snapshotWarnMinutes = input.snapshotWarnMinutes;
  }

  if (!current) {
    // Create with only the fields being set
    const workspaceId = getWorkspaceContext();
    if (!workspaceId) {
      throw new Error("No workspace context set - cannot create intelligence settings");
    }
    await prisma.orgIntelligenceSettings.create({
      data: { ...updateData, workspaceId },
    });
    return;
  }

  await prisma.orgIntelligenceSettings.update({
    where: { workspaceId: current.workspaceId },
    data: updateData,
  });
}

