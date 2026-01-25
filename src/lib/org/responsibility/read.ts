/**
 * Phase K: Responsibility Read Functions
 *
 * Database queries for responsibility tags, profiles, and overrides.
 */

import { prisma } from "@/lib/db";
import type {
  ResponsibilityTag,
  RoleResponsibilityProfile,
  PersonResponsibilityOverride,
} from "@prisma/client";
import type { ResponsibilityTagSummary, RoleProfileSummary } from "./types";

// ============================================================================
// Responsibility Tags
// ============================================================================

/**
 * Get all responsibility tags for a workspace.
 */
export async function getResponsibilityTags(
  workspaceId: string,
  includeArchived = false
): Promise<ResponsibilityTag[]> {
  return prisma.responsibilityTag.findMany({
    where: {
      workspaceId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });
}

/**
 * Get a responsibility tag by key.
 */
export async function getResponsibilityTagByKey(
  workspaceId: string,
  key: string
): Promise<ResponsibilityTag | null> {
  return prisma.responsibilityTag.findUnique({
    where: {
      workspaceId_key: { workspaceId, key },
    },
  });
}

/**
 * Create a responsibility tag.
 */
export async function createResponsibilityTag(params: {
  workspaceId: string;
  key: string;
  label: string;
  description?: string;
  category?: string;
}): Promise<ResponsibilityTag> {
  return prisma.responsibilityTag.create({
    data: {
      workspaceId: params.workspaceId,
      key: params.key.toUpperCase().replace(/\s+/g, "_"),
      label: params.label,
      description: params.description,
      category: params.category,
    },
  });
}

/**
 * Update a responsibility tag.
 */
export async function updateResponsibilityTag(
  workspaceId: string,
  key: string,
  data: { label?: string; description?: string; category?: string }
): Promise<ResponsibilityTag> {
  return prisma.responsibilityTag.update({
    where: {
      workspaceId_key: { workspaceId, key },
    },
    data,
  });
}

/**
 * Archive a responsibility tag (soft delete).
 */
export async function archiveResponsibilityTag(
  workspaceId: string,
  key: string
): Promise<ResponsibilityTag> {
  return prisma.responsibilityTag.update({
    where: {
      workspaceId_key: { workspaceId, key },
    },
    data: { isArchived: true },
  });
}

// ============================================================================
// Role Responsibility Profiles
// ============================================================================

/**
 * Get all role responsibility profiles for a workspace.
 */
export async function getRoleResponsibilityProfiles(
  workspaceId: string
): Promise<RoleProfileSummary[]> {
  const profiles = await prisma.roleResponsibilityProfile.findMany({
    where: { workspaceId },
    include: {
      primaryTags: true,
      allowedTags: true,
      forbiddenTags: true,
    },
    orderBy: { roleType: "asc" },
  });

  return profiles.map((p) => ({
    id: p.id,
    roleType: p.roleType,
    minSeniority: p.minSeniority,
    maxSeniority: p.maxSeniority,
    primaryTags: p.primaryTags.map(mapTagToSummary),
    allowedTags: p.allowedTags.map(mapTagToSummary),
    forbiddenTags: p.forbiddenTags.map(mapTagToSummary),
  }));
}

/**
 * Get a role responsibility profile by roleType.
 */
export async function getRoleResponsibilityProfile(
  workspaceId: string,
  roleType: string
): Promise<RoleProfileSummary | null> {
  const profile = await prisma.roleResponsibilityProfile.findUnique({
    where: {
      workspaceId_roleType: { workspaceId, roleType },
    },
    include: {
      primaryTags: true,
      allowedTags: true,
      forbiddenTags: true,
    },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    roleType: profile.roleType,
    minSeniority: profile.minSeniority,
    maxSeniority: profile.maxSeniority,
    primaryTags: profile.primaryTags.map(mapTagToSummary),
    allowedTags: profile.allowedTags.map(mapTagToSummary),
    forbiddenTags: profile.forbiddenTags.map(mapTagToSummary),
  };
}

/**
 * Create a role responsibility profile.
 * Hard invariant: One profile per roleType per workspace.
 */
export async function createRoleResponsibilityProfile(params: {
  workspaceId: string;
  roleType: string;
  minSeniority?: string;
  maxSeniority?: string;
  primaryTagIds?: string[];
  allowedTagIds?: string[];
  forbiddenTagIds?: string[];
}): Promise<RoleResponsibilityProfile> {
  return prisma.roleResponsibilityProfile.create({
    data: {
      workspaceId: params.workspaceId,
      roleType: params.roleType,
      minSeniority: params.minSeniority as RoleResponsibilityProfile["minSeniority"],
      maxSeniority: params.maxSeniority as RoleResponsibilityProfile["maxSeniority"],
      primaryTags: params.primaryTagIds?.length
        ? { connect: params.primaryTagIds.map((id) => ({ id })) }
        : undefined,
      allowedTags: params.allowedTagIds?.length
        ? { connect: params.allowedTagIds.map((id) => ({ id })) }
        : undefined,
      forbiddenTags: params.forbiddenTagIds?.length
        ? { connect: params.forbiddenTagIds.map((id) => ({ id })) }
        : undefined,
    },
  });
}

/**
 * Update a role responsibility profile.
 */
export async function updateRoleResponsibilityProfile(
  workspaceId: string,
  roleType: string,
  data: {
    minSeniority?: string | null;
    maxSeniority?: string | null;
    primaryTagIds?: string[];
    allowedTagIds?: string[];
    forbiddenTagIds?: string[];
  }
): Promise<RoleResponsibilityProfile> {
  return prisma.roleResponsibilityProfile.update({
    where: {
      workspaceId_roleType: { workspaceId, roleType },
    },
    data: {
      minSeniority: data.minSeniority as RoleResponsibilityProfile["minSeniority"],
      maxSeniority: data.maxSeniority as RoleResponsibilityProfile["maxSeniority"],
      primaryTags: data.primaryTagIds
        ? { set: data.primaryTagIds.map((id) => ({ id })) }
        : undefined,
      allowedTags: data.allowedTagIds
        ? { set: data.allowedTagIds.map((id) => ({ id })) }
        : undefined,
      forbiddenTags: data.forbiddenTagIds
        ? { set: data.forbiddenTagIds.map((id) => ({ id })) }
        : undefined,
    },
  });
}

/**
 * Delete a role responsibility profile.
 */
export async function deleteRoleResponsibilityProfile(
  workspaceId: string,
  roleType: string
): Promise<RoleResponsibilityProfile> {
  return prisma.roleResponsibilityProfile.delete({
    where: {
      workspaceId_roleType: { workspaceId, roleType },
    },
  });
}

// ============================================================================
// Person Responsibility Overrides
// ============================================================================

/**
 * Get all responsibility overrides for a person.
 */
export async function getPersonResponsibilityOverrides(
  workspaceId: string,
  personId: string
): Promise<
  (PersonResponsibilityOverride & { tag: ResponsibilityTag })[]
> {
  return prisma.personResponsibilityOverride.findMany({
    where: { workspaceId, personId },
    include: { tag: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Add a responsibility override for a person.
 */
export async function addPersonResponsibilityOverride(params: {
  workspaceId: string;
  personId: string;
  tagId: string;
  reason?: string;
  expiresAt?: Date;
  createdById: string;
}): Promise<PersonResponsibilityOverride> {
  return prisma.personResponsibilityOverride.create({
    data: {
      workspaceId: params.workspaceId,
      personId: params.personId,
      tagId: params.tagId,
      reason: params.reason,
      expiresAt: params.expiresAt,
      createdById: params.createdById,
    },
  });
}

/**
 * Remove a responsibility override.
 */
export async function removePersonResponsibilityOverride(
  workspaceId: string,
  overrideId: string
): Promise<PersonResponsibilityOverride> {
  return prisma.personResponsibilityOverride.delete({
    where: {
      id: overrideId,
      workspaceId, // Ensure workspace scoping
    },
  });
}

// ============================================================================
// Effective Tags Resolution
// ============================================================================

/**
 * Get effective responsibility tags for a person.
 * Combines role profile tags + person overrides.
 */
export async function getEffectivePersonTags(
  workspaceId: string,
  personId: string,
  roleType: string | null
): Promise<{
  effectiveTags: string[];
  forbiddenTags: string[];
  overrideTags: string[];
  profileExists: boolean;
}> {
  // Get role profile if roleType exists
  let profileTags: string[] = [];
  let forbiddenTags: string[] = [];
  let profileExists = false;

  if (roleType) {
    const profile = await prisma.roleResponsibilityProfile.findUnique({
      where: {
        workspaceId_roleType: { workspaceId, roleType },
      },
      include: {
        primaryTags: { select: { key: true } },
        allowedTags: { select: { key: true } },
        forbiddenTags: { select: { key: true } },
      },
    });

    if (profile) {
      profileExists = true;
      profileTags = [
        ...profile.primaryTags.map((t) => t.key),
        ...profile.allowedTags.map((t) => t.key),
      ];
      forbiddenTags = profile.forbiddenTags.map((t) => t.key);
    }
  }

  // Get person overrides
  const overrides = await prisma.personResponsibilityOverride.findMany({
    where: {
      workspaceId,
      personId,
      // Filter out expired overrides
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { tag: { select: { key: true } } },
  });

  const overrideTags = overrides.map((o) => o.tag.key);

  // Combine: profile tags + overrides (deduplicated)
  const effectiveTags = [...new Set([...profileTags, ...overrideTags])];

  return {
    effectiveTags,
    forbiddenTags,
    overrideTags,
    profileExists,
  };
}

// ============================================================================
// WorkRequest Tags
// ============================================================================

/**
 * Get work tags for a work request.
 */
export async function getWorkRequestTags(
  workspaceId: string,
  workRequestId: string
): Promise<string[]> {
  const workRequest = await prisma.workRequest.findFirst({
    where: {
      id: workRequestId,
      workspaceId,
    },
    include: {
      workTags: { select: { key: true } },
    },
  });

  return workRequest?.workTags.map((t) => t.key) ?? [];
}

/**
 * Set work tags for a work request.
 */
export async function setWorkRequestTags(
  workspaceId: string,
  workRequestId: string,
  tagIds: string[]
): Promise<void> {
  await prisma.workRequest.update({
    where: {
      id: workRequestId,
      workspaceId,
    },
    data: {
      workTags: { set: tagIds.map((id) => ({ id })) },
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

function mapTagToSummary(tag: ResponsibilityTag): ResponsibilityTagSummary {
  return {
    id: tag.id,
    key: tag.key,
    label: tag.label,
    description: tag.description,
    category: tag.category,
    isArchived: tag.isArchived,
  };
}
