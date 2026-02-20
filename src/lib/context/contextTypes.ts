/**
 * Canonical ContextObject Types
 * 
 * Defines the Loopwell Org ContextObject Specification v2.1 compliant types.
 * All Org-related ContextObjects must conform to this structure.
 */

export type ContextStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type ContextType =
  | "person"
  | "team"
  | "department"
  | "role"
  | "org"
  | "task"
  | "project"
  | "page"
  | "note"
  | "goal";

export type ContextRelation = {
  type: string;
  sourceId: string;
  targetId: string;
  label: string;
};

export type ContextObject = {
  id: string;
  type: ContextType;
  title: string;
  summary: string;
  tags: string[];
  relations: ContextRelation[];
  owner: string | null;
  status: ContextStatus;
  updatedAt: string; // ISO8601 timestamp
};

