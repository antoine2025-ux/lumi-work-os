/**
 * Activity Listener Registration
 * 
 * Registers all activity event listeners on the event bus.
 * Call initializeActivityListeners() during app startup.
 */

import { on } from "@/lib/events/emit";
import {
  ACTIVITY_EVENTS,
  TaskCreatedEvent,
  TaskCompletedEvent,
  WikiPageCreatedEvent,
  WikiPageEditedEvent,
  CommentPostedEvent,
  MeetingAttendedEvent,
} from "@/lib/events/activityEvents";
import {
  recordTaskCreation,
  recordTaskCompletion,
  recordWikiActivity,
  recordComment,
  recordMeetingAttendance,
} from "./activityMetricCollector";
import {
  recordTaskCollaboration,
  recordMeetingCollaboration,
} from "./relationshipBuilder";
import { logger } from "@/lib/logger";

// =============================================================================
// Listener Initialization
// =============================================================================

let initialized = false;

/**
 * Initialize all activity event listeners.
 * This should be called once during app startup.
 */
export function initializeActivityListeners(): void {
  if (initialized) {
    logger.warn(
      "[ActivityListeners] Already initialized, skipping duplicate initialization"
    );
    return;
  }

  logger.info("[ActivityListeners] Initializing activity event listeners");

  // Task events
  on<TaskCreatedEvent>(ACTIVITY_EVENTS.TASK_CREATED, async (event) => {
    await recordTaskCreation(event.userId, event.workspaceId);
    
    // If task has an assignee, record collaboration
    if (event.assigneeId && event.assigneeId !== event.userId) {
      await recordTaskCollaboration(event.workspaceId, event.taskId);
    }
  });

  on<TaskCompletedEvent>(ACTIVITY_EVENTS.TASK_COMPLETED, async (event) => {
    await recordTaskCompletion(
      event.userId,
      event.workspaceId,
      event.completionDays
    );
  });

  // Wiki events
  on<WikiPageCreatedEvent>(ACTIVITY_EVENTS.WIKI_PAGE_CREATED, async (event) => {
    await recordWikiActivity(event.userId, event.workspaceId, true);
  });

  on<WikiPageEditedEvent>(ACTIVITY_EVENTS.WIKI_PAGE_EDITED, async (event) => {
    await recordWikiActivity(event.userId, event.workspaceId, false);
  });

  // Comment events
  on<CommentPostedEvent>(ACTIVITY_EVENTS.COMMENT_POSTED, async (event) => {
    await recordComment(event.userId, event.workspaceId);
  });

  // Meeting events (populated separately via calendar sync job)
  on<MeetingAttendedEvent>(ACTIVITY_EVENTS.MEETING_ATTENDED, async (event) => {
    await recordMeetingAttendance(
      event.userId,
      event.workspaceId,
      event.durationHours
    );
    await recordMeetingCollaboration(event.workspaceId, event.attendeeIds);
  });

  initialized = true;
  logger.info("[ActivityListeners] Activity event listeners initialized");
}

// =============================================================================
// Exports
// =============================================================================

// Re-export functions for direct use if needed
export {
  recordTaskCreation,
  recordTaskCompletion,
  recordWikiActivity,
  recordComment,
  recordMeetingAttendance,
} from "./activityMetricCollector";

export {
  recordCollaboration,
  recordMeetingCollaboration,
  recordProjectCollaboration,
  recordTaskCollaboration,
  recordWikiCollaboration,
} from "./relationshipBuilder";

export {
  getWeekStarting,
  calculateCompletionDays,
  sortPersonIds,
  calculateRelationshipStrength,
  inferRelationshipType,
} from "./utils";
