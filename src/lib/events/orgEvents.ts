/**
 * Org-specific event types and payloads
 * 
 * These events are emitted when org entities (departments, teams, positions, people)
 * are created, updated, or deleted.
 */

export type OrgDepartmentCreatedEvent = {
  workspaceId: string;
  departmentId: string;
  data: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type OrgDepartmentUpdatedEvent = {
  workspaceId: string;
  departmentId: string;
  data: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type OrgTeamCreatedEvent = {
  workspaceId: string;
  teamId: string;
  departmentId: string;
  data: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    workspaceId: string;
    departmentId: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type OrgTeamUpdatedEvent = {
  workspaceId: string;
  teamId: string;
  departmentId: string | null; // May change on update
  data: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    workspaceId: string;
    departmentId: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type OrgPositionCreatedEvent = {
  workspaceId: string;
  positionId: string;
  teamId: string | null;
  userId: string | null;
  data: {
    id: string;
    title: string;
    level: number;
    isActive: boolean;
    workspaceId: string;
    teamId: string | null;
    userId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type OrgPositionUpdatedEvent = {
  workspaceId: string;
  positionId: string;
  teamId: string | null; // May change on update
  userId: string | null; // May change on update
  data: {
    id: string;
    title: string;
    level: number;
    isActive: boolean;
    workspaceId: string;
    teamId: string | null;
    userId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type OrgPersonUpdatedEvent = {
  workspaceId: string;
  userId: string;
  positionId: string | null; // May change on update
  teamId: string | null; // May change on update
  departmentId: string | null; // May change on update
  data: {
    id: string;
    name: string | null;
    email: string;
    updatedAt: Date;
  };
};

// Event type constants for consistency
export const ORG_EVENTS = {
  DEPARTMENT_CREATED: "org.department.created",
  DEPARTMENT_UPDATED: "org.department.updated",
  TEAM_CREATED: "org.team.created",
  TEAM_UPDATED: "org.team.updated",
  POSITION_CREATED: "org.position.created",
  POSITION_UPDATED: "org.position.updated",
  PERSON_UPDATED: "org.person.updated",
} as const;

