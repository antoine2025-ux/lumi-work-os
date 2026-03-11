/**
 * Org Context Listeners
 * 
 * These listeners respond to org entity mutations and rebuild the Context Store
 * to keep Loopbrain's understanding of the organization up-to-date.
 */

import { on } from "@/lib/events/emit";
import {
  ORG_EVENTS,
  OrgDepartmentCreatedEvent,
  OrgDepartmentUpdatedEvent,
  OrgTeamCreatedEvent,
  OrgTeamUpdatedEvent,
  OrgPositionCreatedEvent,
  OrgPositionUpdatedEvent,
  OrgPersonUpdatedEvent,
} from "@/lib/events/orgEvents";
import { syncOrgContextBundleToStoreForWorkspace } from "@/lib/org/org-context-store";

/**
 * Rebuild org context for a specific workspace.
 * This is called after any org entity mutation.
 */
async function rebuildOrgContext(workspaceId: string): Promise<void> {
  try {
    await syncOrgContextBundleToStoreForWorkspace(workspaceId);
  } catch (error: unknown) {
    console.error(
      `Failed to rebuild org context for workspace ${workspaceId}:`,
      error
    );
    // Don't throw - we want event handlers to be resilient
  }
}

/**
 * Initialize all org context listeners.
 * Call this during app startup to register the listeners.
 */
export function initializeOrgContextListeners(): void {
  // Department events
  on<OrgDepartmentCreatedEvent>(ORG_EVENTS.DEPARTMENT_CREATED, async (event) => {
    await rebuildOrgContext(event.workspaceId);
  });

  on<OrgDepartmentUpdatedEvent>(ORG_EVENTS.DEPARTMENT_UPDATED, async (event) => {
    await rebuildOrgContext(event.workspaceId);
  });

  // Team events
  on<OrgTeamCreatedEvent>(ORG_EVENTS.TEAM_CREATED, async (event) => {
    await rebuildOrgContext(event.workspaceId);
  });

  on<OrgTeamUpdatedEvent>(ORG_EVENTS.TEAM_UPDATED, async (event) => {
    await rebuildOrgContext(event.workspaceId);
  });

  // Position events
  on<OrgPositionCreatedEvent>(ORG_EVENTS.POSITION_CREATED, async (event) => {
    await rebuildOrgContext(event.workspaceId);
  });

  on<OrgPositionUpdatedEvent>(ORG_EVENTS.POSITION_UPDATED, async (event) => {
    await rebuildOrgContext(event.workspaceId);
  });

  // Person events
  // Person updates cascade to team, department, and org context
  on<OrgPersonUpdatedEvent>(ORG_EVENTS.PERSON_UPDATED, async (event) => {
    await rebuildOrgContext(event.workspaceId);
  });
}

