/**
 * Write services for Org Availability.
 * 
 * IMPORTANT: These services assume Prisma is already workspace-scoped
 * via setWorkspaceContext(workspaceId) in the calling route handler.
 * Do NOT accept workspaceId as an argument.
 */

import { prisma } from "@/lib/db";

export type AvailabilityStatus =
  | "UNKNOWN"
  | "AVAILABLE"
  | "PARTIALLY_AVAILABLE"
  | "UNAVAILABLE";

/**
 * Map DTO availability status to database enum.
 */
function mapToDbStatus(status: AvailabilityStatus): "AVAILABLE" | "LIMITED" | "UNAVAILABLE" {
  switch (status) {
    case "AVAILABLE":
      return "AVAILABLE";
    case "PARTIALLY_AVAILABLE":
      return "LIMITED";
    case "UNAVAILABLE":
      return "UNAVAILABLE";
    case "UNKNOWN":
    default:
      return "AVAILABLE"; // Default to AVAILABLE for UNKNOWN
  }
}

/**
 * Update availability for a person.
 * NOTE: This updates PersonAvailabilityHealth, which uses User.id as personId.
 * IMPORTANT: workspaceId is retrieved from workspace context set by setWorkspaceContext.
 */
export async function updateAvailability(
  positionId: string, // OrgPosition ID
  status: AvailabilityStatus
) {
  // Get the OrgPosition to find userId and workspaceId
  // Use findFirst instead of findUnique to avoid issues if position doesn't exist
  const position = await prisma.orgPosition.findFirst({
    where: { id: positionId },
    select: { 
      id: true,
      userId: true, 
      workspaceId: true,
    },
  });

  if (!position) {
    throw new Error(`OrgPosition with id ${positionId} not found`);
  }

  if (!position.userId) {
    throw new Error(`OrgPosition ${positionId} is not linked to a user (userId is null)`);
  }

  if (!position.workspaceId) {
    throw new Error(`OrgPosition ${positionId} is missing workspaceId`);
  }

  const dbStatus = mapToDbStatus(status);

  // Find existing availability or create new (using workspaceId from position)
  const existing = await prisma.personAvailabilityHealth.findFirst({
    where: {
      workspaceId: position.workspaceId,
      personId: position.userId,
    },
    select: { id: true },
  });

  let availability;
  try {
    availability = existing
      ? await prisma.personAvailabilityHealth.update({
          where: { id: existing.id },
          data: {
            status: dbStatus,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            status: true,
            updatedAt: true,
            personId: true,
          },
        })
      : await prisma.personAvailabilityHealth.create({
          data: {
            workspaceId: position.workspaceId,
            personId: position.userId,
            status: dbStatus,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            status: true,
            updatedAt: true,
            personId: true,
          },
        });
  } catch (dbError: unknown) {
    const errMsg = dbError instanceof Error ? dbError.message : "Database error";
    const errCode = (dbError as Record<string, unknown>)?.code;
    const errMeta = (dbError as Record<string, unknown>)?.meta;
    console.error("[updateAvailability] Database error:", {
      error: errMsg,
      code: errCode,
      meta: errMeta,
      positionId,
      userId: position.userId,
      workspaceId: position.workspaceId,
      status: dbStatus,
      existing: !!existing,
    });
    // Re-throw with more context
    throw new Error(`Failed to ${existing ? 'update' : 'create'} availability: ${errMsg}`);
  }

  // Map back to DTO format
  let availabilityStatus: AvailabilityStatus = "UNKNOWN";
  switch (availability.status) {
    case "AVAILABLE":
      availabilityStatus = "AVAILABLE";
      break;
    case "LIMITED":
      availabilityStatus = "PARTIALLY_AVAILABLE";
      break;
    case "UNAVAILABLE":
      availabilityStatus = "UNAVAILABLE";
      break;
  }

  return {
    id: positionId, // Return position ID for consistency
    userId: availability.personId,
    availabilityStatus,
    availabilityUpdatedAt: availability.updatedAt.toISOString(),
  };
}

