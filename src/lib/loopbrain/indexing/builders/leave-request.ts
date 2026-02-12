/**
 * Leave Request Index Builder
 *
 * Fetches a leave request and builds a ContextObject for indexing.
 * Maps to time_off-like structure for Loopbrain compatibility.
 */

import { PrismaClient } from "@prisma/client";
import { ContextObject } from "@/lib/context/context-types";

export interface BuildContextObjectParams {
  workspaceId: string;
  entityId: string;
  userId?: string;
  prisma: PrismaClient;
}

export async function buildContextObjectForLeaveRequest(
  params: BuildContextObjectParams
): Promise<ContextObject | null> {
  const { workspaceId, entityId, prisma } = params;

  try {
    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: {
        id: entityId,
        workspaceId,
      },
    });

    if (!leaveRequest) {
      return null;
    }

    const isApproved = leaveRequest.status === "APPROVED";
    const typeLabel = leaveRequest.leaveType.toLowerCase();

    return {
      id: leaveRequest.id,
      type: "time_off",
      title: `${leaveRequest.leaveType} - ${leaveRequest.startDate.toISOString().split("T")[0]} to ${leaveRequest.endDate.toISOString().split("T")[0]}`,
      summary: `${leaveRequest.leaveType} leave from ${leaveRequest.startDate.toISOString().split("T")[0]} to ${leaveRequest.endDate.toISOString().split("T")[0]}`,
      tags: ["time-off", typeLabel, ...(isApproved ? ["approved"] : ["pending"])],
      ownerId: leaveRequest.personId,
      status: isApproved ? "active" : "pending",
      updatedAt: leaveRequest.updatedAt,
      relations: [
        {
          type: "person",
          id: leaveRequest.personId,
          label: "person",
          direction: "out",
        },
      ],
      metadata: {
        startDate: leaveRequest.startDate.toISOString(),
        endDate: leaveRequest.endDate.toISOString(),
        type: leaveRequest.leaveType,
        status: leaveRequest.status,
      },
      workspaceId,
    };
  } catch (error) {
    console.error("Failed to build leave request context object", {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
