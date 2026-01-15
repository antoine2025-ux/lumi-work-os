export type OrgContextType =
  | "org"
  | "department"
  | "team"
  | "position"
  | "person";

export type OrgRelationType =
  | "has_department"
  | "has_team"
  | "has_position"
  | "has_person"
  | "member_of_department"
  | "member_of_team"
  | "reports_to"
  | "occupies_position";

export type OrgRelation = {
  type: OrgRelationType;
  sourceId: string;
  targetId: string;
  label?: string;
};

export type OrgContextObject = {
  id: string;
  type: OrgContextType;
  title: string;
  summary: string;
  tags: string[];
  relations: OrgRelation[];
  owner: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  updatedAt: string; // ISO string
};

export function nowIso(): string {
  return new Date().toISOString();
}

