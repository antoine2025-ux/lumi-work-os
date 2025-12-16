/**
 * Org QA Types
 * 
 * Type definitions for Org QA questions and summary tracking.
 */

export type OrgQaStatus = "pass" | "partial" | "fail";

export type OrgQaQuestionType =
  | "org.person"
  | "org.team"
  | "org.department"
  | "org.role"
  | "org.org";

export type OrgQaQuestion = {
  id: string;
  label: string;
  type: OrgQaQuestionType;
  status: OrgQaStatus;
  // Optional notes, e.g. short reason or link to failure-analysis doc
  notes?: string;
};

export type OrgQaSummaryByType = {
  type: OrgQaQuestionType;
  label: string;
  total: number;
  pass: number;
  partial: number;
  fail: number;
};

/**
 * Runtime override for a single question's status.
 * This represents the most recent run in the current session.
 */
export type OrgQaStatusOverride = {
  id: string; // question id
  status: OrgQaStatus;
  updatedAt: string; // ISO timestamp
};

