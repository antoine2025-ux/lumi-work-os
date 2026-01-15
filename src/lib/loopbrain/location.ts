/**
 * Loopbrain Location Types
 * 
 * Defines location shapes for Loopbrain queries to provide context
 * about where the query originated and what entities are in focus.
 */

export type LoopbrainLocationView =
  | "org.overview"
  | "org.people"
  | "org.person"
  | "org.team"
  | "org.department"
  | "org.position";

export type LoopbrainLocation = {
  mode: "org" | string;
  view: LoopbrainLocationView | string;
  workspaceId: string;
  personId?: string;
  teamId?: string;
  departmentId?: string;
  positionId?: string;
};

