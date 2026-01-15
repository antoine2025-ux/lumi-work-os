// src/lib/loopbrain/org/types.ts

export type OrgLoopbrainEntityType =
  | "org"
  | "department"
  | "team"
  | "role"
  | "person";

export type OrgLoopbrainStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface OrgLoopbrainRelation {
  type: string; // "has_department" | "has_team" | "has_role" | "has_person" | etc.
  sourceId: string;
  targetId: string;
  label: string;
}

/**
 * Canonical ContextObject shape for Loopbrain Org graph.
 * Matches the Loopwell Org ContextObject v2.1 spec.
 */
export interface OrgLoopbrainContextObject {
  id: string;
  type: OrgLoopbrainEntityType;
  title: string;
  summary: string;
  tags: string[];
  relations: OrgLoopbrainRelation[];
  owner: string | null;
  status: OrgLoopbrainStatus;
  updatedAt: string; // ISO8601
}

/**
 * Lightweight "bundle" that Loopbrain Orchestrator can consume.
 */
export interface OrgLoopbrainContextBundle {
  primary: OrgLoopbrainContextObject | null; // org node
  related: OrgLoopbrainContextObject[]; // depts, teams, roles, people
  byId: Record<string, OrgLoopbrainContextObject>; // fast lookup
}

