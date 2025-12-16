/**
 * Shared types for Loopbrain question responses
 * 
 * These types provide a consistent response schema across all Loopbrain questions.
 */

export type LoopbrainAssessment =
  | "likely_feasible"
  | "possibly_feasible"
  | "unlikely_feasible"
  | "insufficient_data";

export type LoopbrainConfidence = "high" | "medium" | "low";

export type LoopbrainError = {
  code: string;
  message: string;
};

export type LoopbrainBaseResponse = {
  questionId: string;
  timeframe?: { start: string; end: string };
  assumptions: string[];
  constraints: string[];
  risks: string[];
  confidence: LoopbrainConfidence;
  errors?: LoopbrainError[];
};

export type OwnerDecisionValue =
  | { type: "person"; personId: string; name?: string }
  | { type: "role"; role: string }
  | { type: "unset" };

export type Q1Response = LoopbrainBaseResponse & {
  owner: OwnerDecisionValue;
};

export type Q2Response = LoopbrainBaseResponse & {
  decision: OwnerDecisionValue;
  escalation: OwnerDecisionValue;
};

export type Q5Response = LoopbrainBaseResponse & {
  personId: string;
  name?: string;
  currentStatus: "available" | "partial" | "unavailable";
  returnDate?: string; // ISO, only for unavailable with end date
  activeWindows: Array<{
    type: "unavailable" | "partial";
    start: string;
    end?: string;
    fraction?: number;
    note?: string;
  }>;
};

export type Q6Response = LoopbrainBaseResponse & {
  projectId: string;
  primaryOwner: OwnerDecisionValue;
  backups: {
    backupOwner: OwnerDecisionValue;
    backupDecision?: OwnerDecisionValue;
  };
  candidates: Array<{
    type: "person" | "role";
    personId?: string;
    name?: string;
    role?: string;
    source: "explicit_backup" | "same_role" | "same_team" | "allocated_to_project";
    notes?: string[];
  }>;
};

export type Q7Response = LoopbrainBaseResponse & {
  projectId: string;
  ownerAlignment?: { status: "aligned" | "misaligned" | "unknown"; reason?: string };
  decisionAlignment?: { status: "aligned" | "misaligned" | "unknown"; reason?: string };
  notes: string[];
};

export type Q8Response = LoopbrainBaseResponse & {
  projectId: string;
  status: "clear" | "fragmented" | "unknown";
  missing: Array<"owner" | "decision">;
};

export type Q9Action =
  | "proceed"
  | "reassign"
  | "delay"
  | "request_support"
  | "insufficient_data";

export type Q9Option = {
  action: Exclude<Q9Action, "insufficient_data">;
  title: string;
  rationale: string[];
  prerequisites?: string[];
  risks?: string[];
};

export type Q9Response = LoopbrainBaseResponse & {
  projectId: string;
  timeframe?: { start: string; end: string };
  decision: {
    action: Q9Action;
    explanation: string[];
  };
  options: Q9Option[];
  evidence: {
    ownership: "set" | "missing";
    decisionAuthority: "set" | "missing";
    availability: "known" | "unknown";
    allocations: "known" | "unknown";
    capacityAssessment?: "likely_feasible" | "possibly_feasible" | "unlikely_feasible" | "insufficient_data";
    roleAlignment?: {
      owner?: "aligned" | "misaligned" | "unknown";
      decision?: "aligned" | "misaligned" | "unknown";
    };
    fragmentation?: "clear" | "fragmented" | "unknown";
  };
};

