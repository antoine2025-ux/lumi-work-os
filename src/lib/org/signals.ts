/**
 * Org Signals
 * 
 * Signals are UI projections of issues (human-facing).
 * Signals MUST reference canonical issue identifiers (issueKey), not re-derive logic.
 * 
 * Contract: Issues = canonical, structured, queryable problems (LoopBrain-facing).
 *           Signals = UI projections of issues (human-facing).
 */

import type { OrgIssueMetadata } from './deriveIssues';

export type OrgSignal = {
  issueKey: string; // Primary identifier: `${issueType}:${entityType}:${entityId}` (references issue.issueKey)
  type: 'missing_owner' | 'empty_department' | 'unassigned_team' | 'missing_manager' | 'ownership_conflict' | 'unowned_team' | 'unowned_department' | string;
  severity: 'error' | 'warning' | 'info';
  entityType: 'TEAM' | 'DEPARTMENT' | 'PERSON' | 'POSITION' | 'DECISION_DOMAIN' | 'WORK_REQUEST' | 'ROLE_COVERAGE';
  entityId: string;
  entityName: string;
  explanation: string; // Human-readable
  fixUrl: string; // Deep link to edit surface
  fixAction: string; // "Assign owner", "Add team", etc.
  // Confidence scoring happens here (not in resolver)
  confidence?: SignalConfidence; // Computed in deriveSignalsFromIssues
};

export type SignalConfidence = {
  completeness: number; // 0-1, based on data completeness
  consistency: number; // 0-1, based on cross-tab consistency (e.g., ownership conflicts)
  freshness: number; // 0-1, based on last update time
  overall: number; // weighted average
  explanation: string; // Deterministic explanation: "Low consistency due to ownership conflict"
};

/**
 * Map issue type to signal type
 */
function mapIssueTypeToSignalType(issueType: string): OrgSignal['type'] {
  const mapping: Record<string, OrgSignal['type']> = {
    'OWNERSHIP_CONFLICT': 'ownership_conflict',
    'UNOWNED_TEAM': 'unowned_team',
    'UNOWNED_DEPARTMENT': 'unowned_department',
    'UNASSIGNED_TEAM': 'unassigned_team',
    'EMPTY_DEPARTMENT': 'empty_department',
    'MISSING_MANAGER': 'missing_manager',
    'ORPHAN_ENTITY': 'missing_owner',
  };
  return mapping[issueType] || 'missing_owner';
}

/**
 * Map issue type to severity
 */
function mapIssueTypeToSeverity(issueType: string): OrgSignal['severity'] {
  const mapping: Record<string, OrgSignal['severity']> = {
    'OWNERSHIP_CONFLICT': 'error',
    'UNOWNED_TEAM': 'warning',
    'UNOWNED_DEPARTMENT': 'warning',
    'UNASSIGNED_TEAM': 'info',
    'EMPTY_DEPARTMENT': 'info',
    'MISSING_MANAGER': 'warning',
    'ORPHAN_ENTITY': 'warning',
  };
  return mapping[issueType] || 'warning';
}

/**
 * Compute signal confidence based on issue metadata + resolver flags (NOT in resolver)
 * 
 * @param issue - Issue metadata
 * @returns Signal confidence with deterministic explanation
 */
function computeSignalConfidence(issue: OrgIssueMetadata): SignalConfidence {
  let completeness = 1.0;
  let consistency = 1.0;
  let freshness = 1.0;

  // Consistency: ownership conflicts lower confidence
  if (issue.type === 'OWNERSHIP_CONFLICT') {
    consistency = 0.5;
  }

  // Completeness: unowned entities suggest incomplete data
  if (issue.type === 'UNOWNED_TEAM' || issue.type === 'UNOWNED_DEPARTMENT') {
    completeness = 0.7;
  }

  // Freshness: assume fresh for now (can be enhanced with last update time)
  freshness = 1.0;

  const overall = (completeness + consistency + freshness) / 3;

  // Build deterministic explanation
  const parts: string[] = [];
  if (completeness < 1.0) {
    parts.push(`Completeness: ${Math.round(completeness * 100)}%`);
  }
  if (consistency < 1.0) {
    parts.push(`Consistency: ${Math.round(consistency * 100)}% (ownership conflict detected)`);
  }
  if (freshness < 1.0) {
    parts.push(`Freshness: ${Math.round(freshness * 100)}%`);
  }

  const explanation = parts.length > 0
    ? parts.join(', ')
    : 'High confidence: all data sources consistent';

  return {
    completeness,
    consistency,
    freshness,
    overall,
    explanation,
  };
}

/**
 * Generate signals from issues (NOT parallel logic)
 * Signals derive from issues using issueKey as primary identifier
 * 
 * @param issues - Array of canonical issues
 * @returns Array of signals derived from issues
 */
export function deriveSignalsFromIssues(issues: OrgIssueMetadata[]): OrgSignal[] {
  return issues.map((issue) => {
    // issueKey is the primary identifier
    const signal: OrgSignal = {
      issueKey: issue.issueKey, // Use issueKey directly (canonical identifier)
      type: mapIssueTypeToSignalType(issue.type),
      severity: mapIssueTypeToSeverity(issue.type),
      entityType: issue.entityType,
      entityId: issue.entityId,
      entityName: issue.entityName,
      explanation: issue.explanation,
      fixUrl: issue.fixUrl,
      fixAction: issue.fixAction,
      // Compute confidence here (based on issue metadata + resolver flags)
      confidence: computeSignalConfidence(issue),
    };
    return signal;
  });
}
