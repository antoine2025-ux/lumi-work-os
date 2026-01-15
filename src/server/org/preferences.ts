/**
 * Org UI Preferences service.
 * 
 * Manages per-user, per-workspace UI preferences (filters, views, etc.).
 * Preferences are stored as JSON and keyed by user + workspace + key.
 */

import { prisma } from "@/lib/db";

/**
 * Get a preference value for a specific user in a workspace.
 */
export async function getOrgPreferenceForUser<T>(input: {
  workspaceId: string;
  userId: string;
  key: string;
}): Promise<T | null> {
  const row = await prisma.orgUiPreference.findUnique({
    where: {
      workspaceId_userId_key: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        key: input.key,
      },
    },
    select: { valueJson: true },
  });
  return (row?.valueJson as any) ?? null;
}

/**
 * Set a preference value for a specific user in a workspace.
 */
export async function setOrgPreferenceForUser(input: {
  workspaceId: string;
  userId: string;
  key: string;
  valueJson: any;
}): Promise<void> {
  await prisma.orgUiPreference.upsert({
    where: {
      workspaceId_userId_key: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        key: input.key,
      },
    },
    update: { valueJson: input.valueJson },
    create: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      key: input.key,
      valueJson: input.valueJson,
    },
  });
}

