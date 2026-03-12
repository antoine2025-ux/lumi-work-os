/**
 * Loopbrain Event Listener
 *
 * Registers event listeners for entity changes that affect the entity graph.
 * Invalidates the graph cache when relevant entities are modified.
 *
 * Integration points:
 * - Org events (department, team, position, person)
 * - Project events (project, task, epic)
 * - Capacity events (allocation, contract)
 * - Skill events (person skill)
 */

import { Server as SocketIOServer } from "socket.io";
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
import { invalidateGraphCache } from "./entity-graph";
import { logger } from "@/lib/logger";
import type { EntityTypeV0 } from "./contract/entityLinks.v0";

// =============================================================================
// Types
// =============================================================================

interface EntityChangeEvent {
  workspaceId: string;
  entityType: EntityTypeV0;
  entityId: string;
  action: "created" | "updated" | "deleted";
}

// =============================================================================
// Event Handler
// =============================================================================

/**
 * Handle entity changes by invalidating the graph cache.
 * This ensures the next graph request will rebuild with fresh data.
 */
export async function handleEntityChange(
  workspaceId: string,
  entityType: EntityTypeV0,
  entityId: string
): Promise<void> {
  try {
    // Invalidate the graph cache for this workspace
    invalidateGraphCache(workspaceId);

    logger.debug("[LoopbrainEventListener] Entity change handled", {
      workspaceId,
      entityType,
      entityId,
    });
  } catch (error: unknown) {
    logger.error("[LoopbrainEventListener] Failed to handle entity change", {
      workspaceId,
      entityType,
      entityId,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}

// =============================================================================
// Org Event Listeners
// =============================================================================

/**
 * Initialize org-related event listeners for entity graph updates.
 */
function initializeOrgEventListeners(): void {
  // Department events
  on<OrgDepartmentCreatedEvent>(
    ORG_EVENTS.DEPARTMENT_CREATED,
    async (event) => {
      await handleEntityChange(
        event.workspaceId,
        "DEPARTMENT",
        event.departmentId
      );
    }
  );

  on<OrgDepartmentUpdatedEvent>(
    ORG_EVENTS.DEPARTMENT_UPDATED,
    async (event) => {
      await handleEntityChange(
        event.workspaceId,
        "DEPARTMENT",
        event.departmentId
      );
    }
  );

  // Team events
  on<OrgTeamCreatedEvent>(ORG_EVENTS.TEAM_CREATED, async (event) => {
    await handleEntityChange(event.workspaceId, "TEAM", event.teamId);
  });

  on<OrgTeamUpdatedEvent>(ORG_EVENTS.TEAM_UPDATED, async (event) => {
    await handleEntityChange(event.workspaceId, "TEAM", event.teamId);
  });

  // Position events (affect PERSON and ROLE nodes)
  on<OrgPositionCreatedEvent>(ORG_EVENTS.POSITION_CREATED, async (event) => {
    await handleEntityChange(event.workspaceId, "ROLE", event.positionId);
    if (event.userId) {
      await handleEntityChange(event.workspaceId, "PERSON", event.userId);
    }
  });

  on<OrgPositionUpdatedEvent>(ORG_EVENTS.POSITION_UPDATED, async (event) => {
    await handleEntityChange(event.workspaceId, "ROLE", event.positionId);
    if (event.userId) {
      await handleEntityChange(event.workspaceId, "PERSON", event.userId);
    }
  });

  // Person events
  on<OrgPersonUpdatedEvent>(ORG_EVENTS.PERSON_UPDATED, async (event) => {
    await handleEntityChange(event.workspaceId, "PERSON", event.userId);
  });
}

// =============================================================================
// Socket.IO Integration
// =============================================================================

/**
 * Register Loopbrain event listeners on the Socket.IO server.
 * This enables real-time graph updates when entities change.
 *
 * @param io - Socket.IO server instance
 */
export function registerLoopbrainEventListeners(io: SocketIOServer): void {
  logger.info("[LoopbrainEventListener] Registering Socket.IO listeners");

  // Listen for project events
  io.on("connection", (socket) => {
    // Project created/updated
    socket.on(
      "projectUpdated",
      async (data: { projectId: string; workspaceId: string }) => {
        await handleEntityChange(data.workspaceId, "PROJECT", data.projectId);
      }
    );

    // Task created/updated (affects project health)
    socket.on(
      "taskUpdated",
      async (data: {
        taskId: string;
        projectId: string;
        workspaceId: string;
      }) => {
        // Tasks don't have their own node type, but affect project health
        await handleEntityChange(data.workspaceId, "PROJECT", data.projectId);
      }
    );

    // Skill assignment changed
    socket.on(
      "personSkillUpdated",
      async (data: { personId: string; workspaceId: string }) => {
        await handleEntityChange(data.workspaceId, "PERSON", data.personId);
      }
    );

    // Work allocation changed
    socket.on(
      "workAllocationUpdated",
      async (data: { personId: string; workspaceId: string }) => {
        await handleEntityChange(data.workspaceId, "PERSON", data.personId);
      }
    );

    // Capacity contract changed
    socket.on(
      "capacityContractUpdated",
      async (data: { personId: string; workspaceId: string }) => {
        await handleEntityChange(data.workspaceId, "PERSON", data.personId);
      }
    );

    // Decision domain changed
    socket.on(
      "decisionDomainUpdated",
      async (data: { domainId: string; workspaceId: string }) => {
        await handleEntityChange(
          data.workspaceId,
          "DECISION_DOMAIN",
          data.domainId
        );
      }
    );

    // Work request changed
    socket.on(
      "workRequestUpdated",
      async (data: { requestId: string; workspaceId: string }) => {
        await handleEntityChange(
          data.workspaceId,
          "WORK_REQUEST",
          data.requestId
        );
      }
    );
  });
}

// =============================================================================
// Initialization
// =============================================================================

let initialized = false;

/**
 * Initialize all Loopbrain event listeners.
 * This should be called once during app startup.
 */
export function initializeLoopbrainEventListeners(): void {
  if (initialized) {
    logger.warn(
      "[LoopbrainEventListener] Already initialized, skipping duplicate initialization"
    );
    return;
  }

  logger.info("[LoopbrainEventListener] Initializing event listeners");

  // Initialize org event listeners
  initializeOrgEventListeners();

  initialized = true;
  logger.info("[LoopbrainEventListener] Event listeners initialized");
}

/**
 * Start the entity graph event listener.
 * Call once when the Socket.IO server starts (e.g. in createSocketServer).
 * Initializes org event listeners and registers Socket.IO handlers for
 * real-time entity graph cache invalidation.
 */
export function startEntityGraphListener(io: SocketIOServer): void {
  initializeLoopbrainEventListeners();
  registerLoopbrainEventListeners(io);
}

// =============================================================================
// Exports for Testing
// =============================================================================

export type { EntityChangeEvent };
