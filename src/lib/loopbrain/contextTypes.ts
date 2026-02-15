export type ContextStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type ContextType =
  | "org"
  | "department"
  | "team"
  | "role"
  | "person"
  | "project"
  | "task"
  | "page"
  | "note"
  | "goal";

export type ContextRelationType =
  | "reports_to"
  | "manages"
  | "member_of_team"
  | "member_of_department"
  | "has_person"
  | "has_team"
  | "has_department"
  | "has_role"
  | "responsible_for"
  | "owns";

export type ContextRelation = {
  type: ContextRelationType | string;
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
  updatedAt: string; // ISO8601
};

