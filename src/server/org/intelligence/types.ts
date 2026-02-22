/**
 * Org Intelligence signal types.
 * 
 * These types define the contract for derived intelligence signals.
 * All signals must be:
 * - Derived (never manually entered)
 * - Explainable
 * - Reversible
 * - Source-traceable
 */

export type OrgIntelligenceSignal =
  | "MANAGEMENT_LOAD"
  | "OWNERSHIP_RISK"
  | "STRUCTURAL_GAP";

export type IntelligenceSeverity = "LOW" | "MEDIUM" | "HIGH";

export type OrgIntelligenceFinding = {
  signal: OrgIntelligenceSignal;
  severity: IntelligenceSeverity;
  entityType: "PERSON" | "TEAM" | "DEPARTMENT" | "ORG";
  entityId: string | null;
  title: string;
  explanation: string;
  evidence: Record<string, string | number | boolean | null>;
};

