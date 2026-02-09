/**
 * Activity Event Types
 * 
 * These events are emitted when users perform activities that should be tracked
 * for PersonActivityMetric and PersonRelationship models.
 */

// =============================================================================
// Event Type Definitions
// =============================================================================

export type TaskCreatedEvent = {
  workspaceId: string;
  userId: string;
  taskId: string;
  projectId: string;
  assigneeId: string | null;
  timestamp: Date;
};

export type TaskCompletedEvent = {
  workspaceId: string;
  userId: string;
  taskId: string;
  projectId: string;
  completionDays: number;
  timestamp: Date;
};

export type WikiPageCreatedEvent = {
  workspaceId: string;
  userId: string;
  wikiPageId: string;
  timestamp: Date;
};

export type WikiPageEditedEvent = {
  workspaceId: string;
  userId: string;
  wikiPageId: string;
  timestamp: Date;
};

export type CommentPostedEvent = {
  workspaceId: string;
  userId: string;
  commentId: string;
  taskId?: string;
  projectId?: string;
  timestamp: Date;
};

export type MeetingAttendedEvent = {
  workspaceId: string;
  userId: string;
  meetingId: string;
  attendeeIds: string[];
  durationHours: number;
  timestamp: Date;
};

export type ProjectCollaborationEvent = {
  workspaceId: string;
  projectId: string;
  memberIds: string[];
  timestamp: Date;
};

// =============================================================================
// Event Type Constants
// =============================================================================

export const ACTIVITY_EVENTS = {
  TASK_CREATED: "activity.task.created",
  TASK_COMPLETED: "activity.task.completed",
  WIKI_PAGE_CREATED: "activity.wiki.created",
  WIKI_PAGE_EDITED: "activity.wiki.edited",
  COMMENT_POSTED: "activity.comment.posted",
  MEETING_ATTENDED: "activity.meeting.attended",
  PROJECT_COLLABORATION: "activity.project.collaboration",
} as const;
