/**
 * Relationship Builder
 * 
 * Builds and maintains the PersonRelationship graph based on collaboration signals.
 * Tracks meetings, projects, tasks, and wiki collaborations between people.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  sortPersonIds,
  calculateRelationshipStrength,
  inferRelationshipType,
} from "./utils";

// =============================================================================
// Core Collaboration Recording
// =============================================================================

export type CollaborationSignal = "meeting" | "project" | "task" | "wiki";

/**
 * Record a collaboration between two people.
 * Updates the PersonRelationship record, creating it if it doesn't exist.
 * 
 * Always sorts personAId < personBId to avoid duplicate pairs.
 */
export async function recordCollaboration(
  workspaceId: string,
  personAId: string,
  personBId: string,
  signal: CollaborationSignal
): Promise<void> {
  // Don't create self-relationships
  if (personAId === personBId) {
    return;
  }

  try {
    // Sort IDs to ensure canonical ordering
    const [sortedPersonAId, sortedPersonBId] = sortPersonIds(personAId, personBId);

    // Get current relationship to calculate new strength
    const currentRelationship = await prisma.personRelationship.findUnique({
      where: {
        workspaceId_personAId_personBId: {
          workspaceId,
          personAId: sortedPersonAId,
          personBId: sortedPersonBId,
        },
      },
      select: {
        meetingsShared: true,
        projectsShared: true,
        tasksShared: true,
        wikisShared: true,
      },
    });

    // Calculate increments
    const meetingsShared = currentRelationship?.meetingsShared ?? 0;
    const projectsShared = currentRelationship?.projectsShared ?? 0;
    const tasksShared = currentRelationship?.tasksShared ?? 0;
    const wikisShared = currentRelationship?.wikisShared ?? 0;

    // Apply increment based on signal
    const newCounts = {
      meetingsShared: signal === "meeting" ? meetingsShared + 1 : meetingsShared,
      projectsShared: signal === "project" ? projectsShared + 1 : projectsShared,
      tasksShared: signal === "task" ? tasksShared + 1 : tasksShared,
      wikisShared: signal === "wiki" ? wikisShared + 1 : wikisShared,
    };

    // Calculate new strength
    const strength = calculateRelationshipStrength(
      newCounts.meetingsShared,
      newCounts.projectsShared,
      newCounts.tasksShared,
      newCounts.wikisShared
    );

    // Infer relationship type
    const relationshipType = inferRelationshipType(sortedPersonAId, sortedPersonBId);

    // Upsert the relationship
    await prisma.personRelationship.upsert({
      where: {
        workspaceId_personAId_personBId: {
          workspaceId,
          personAId: sortedPersonAId,
          personBId: sortedPersonBId,
        },
      },
      create: {
        workspaceId,
        personAId: sortedPersonAId,
        personBId: sortedPersonBId,
        relationshipType,
        strength,
        meetingsShared: signal === "meeting" ? 1 : 0,
        projectsShared: signal === "project" ? 1 : 0,
        tasksShared: signal === "task" ? 1 : 0,
        wikisShared: signal === "wiki" ? 1 : 0,
        lastInteraction: new Date(),
      },
      update: {
        meetingsShared: newCounts.meetingsShared,
        projectsShared: newCounts.projectsShared,
        tasksShared: newCounts.tasksShared,
        wikisShared: newCounts.wikisShared,
        strength,
        lastInteraction: new Date(),
        relationshipType, // Update in case org structure changed
      },
    });

    logger.debug("[RelationshipBuilder] Recorded collaboration", {
      workspaceId,
      personAId: sortedPersonAId,
      personBId: sortedPersonBId,
      signal,
      strength,
    });
  } catch (error) {
    logger.error("[RelationshipBuilder] Failed to record collaboration", {
      workspaceId,
      personAId,
      personBId,
      signal,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}

// =============================================================================
// Meeting Collaboration
// =============================================================================

/**
 * Record meeting collaboration between all pairs of attendees.
 * For a meeting with attendees [A, B, C], creates relationships:
 * A↔B, A↔C, B↔C
 */
export async function recordMeetingCollaboration(
  workspaceId: string,
  attendeeIds: string[]
): Promise<void> {
  if (attendeeIds.length < 2) {
    // No collaboration if only 0 or 1 attendee
    return;
  }

  try {
    // Record collaboration for each pair
    for (let i = 0; i < attendeeIds.length; i++) {
      for (let j = i + 1; j < attendeeIds.length; j++) {
        await recordCollaboration(
          workspaceId,
          attendeeIds[i],
          attendeeIds[j],
          "meeting"
        );
      }
    }

    logger.debug("[RelationshipBuilder] Recorded meeting collaboration", {
      workspaceId,
      attendeeCount: attendeeIds.length,
      pairsCreated: (attendeeIds.length * (attendeeIds.length - 1)) / 2,
    });
  } catch (error) {
    logger.error("[RelationshipBuilder] Failed to record meeting collaboration", {
      workspaceId,
      attendeeIds,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}

// =============================================================================
// Project Collaboration
// =============================================================================

/**
 * Record project collaboration between all project members.
 * Loads project members from ProjectMember table and creates relationships
 * for each pair.
 */
export async function recordProjectCollaboration(
  workspaceId: string,
  projectId: string
): Promise<void> {
  try {
    // Get all project members
    const members = await prisma.projectMember.findMany({
      where: {
        projectId,
      },
      select: {
        userId: true,
      },
    });

    const memberIds = members.map((m) => m.userId);

    if (memberIds.length < 2) {
      // No collaboration if only 0 or 1 member
      return;
    }

    // Record collaboration for each pair
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        await recordCollaboration(
          workspaceId,
          memberIds[i],
          memberIds[j],
          "project"
        );
      }
    }

    logger.debug("[RelationshipBuilder] Recorded project collaboration", {
      workspaceId,
      projectId,
      memberCount: memberIds.length,
      pairsCreated: (memberIds.length * (memberIds.length - 1)) / 2,
    });
  } catch (error) {
    logger.error("[RelationshipBuilder] Failed to record project collaboration", {
      workspaceId,
      projectId,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}

// =============================================================================
// Task Collaboration
// =============================================================================

/**
 * Record task collaboration between task creator and assignee.
 * Only records if they are different people.
 */
export async function recordTaskCollaboration(
  workspaceId: string,
  taskId: string
): Promise<void> {
  try {
    // Get task with creator and assignee
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        createdById: true,
        assigneeId: true,
      },
    });

    if (!task || !task.assigneeId) {
      // No collaboration if task not found or has no assignee
      return;
    }

    if (task.createdById === task.assigneeId) {
      // No collaboration if creator is the assignee
      return;
    }

    await recordCollaboration(
      workspaceId,
      task.createdById,
      task.assigneeId,
      "task"
    );

    logger.debug("[RelationshipBuilder] Recorded task collaboration", {
      workspaceId,
      taskId,
      creatorId: task.createdById,
      assigneeId: task.assigneeId,
    });
  } catch (error) {
    logger.error("[RelationshipBuilder] Failed to record task collaboration", {
      workspaceId,
      taskId,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}

// =============================================================================
// Wiki Collaboration
// =============================================================================

/**
 * Record wiki collaboration between two users.
 * This is called when two people edit the same wiki page.
 */
export async function recordWikiCollaboration(
  workspaceId: string,
  personAId: string,
  personBId: string
): Promise<void> {
  await recordCollaboration(workspaceId, personAId, personBId, "wiki");
}
