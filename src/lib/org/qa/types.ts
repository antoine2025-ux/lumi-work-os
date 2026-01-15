export type OrgQaStatus = "pass" | "partial" | "fail" | "stub";

export type OrgQaQuestionType =
  | "org_structure"
  | "people"
  | "hierarchy"
  | "health"
  | "other"
  | string;

export interface OrgQaQuestionDefinition {
  id: string;
  label: string;
  description?: string | null;
  type: OrgQaQuestionType;
}

export interface OrgQaQuestionWithStatus extends OrgQaQuestionDefinition {
  status: OrgQaStatus;
  lastUpdated?: string | null;
}
