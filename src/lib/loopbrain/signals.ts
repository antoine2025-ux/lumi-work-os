/**
 * LoopBrain v1 Signals
 * 
 * Signals are facts emitted from the People modeling surface.
 * They represent gaps, changes, and structural observations that LoopBrain can reason over.
 * 
 * Key principles:
 * - Signals are facts, not opinions
 * - Incomplete data is treated as signal, not error
 * - Signals are append-only (no deduping in v1)
 * 
 * Phase 1 Extensions:
 * - Intentional absence signals
 * - Cycle detection
 * - Extended severity levels
 * 
 * Phase 5 Extensions:
 * - Intelligence signals (management load, availability, skills)
 */

// Base structural signals
export type StructuralSignal =
  | "MISSING_MANAGER"
  | "MISSING_TEAM"
  | "MISSING_ROLE"
  | "ORPHAN_MANAGER"
  | "DUPLICATE_PERSON"
  | "STRUCTURE_CHANGED"
  | "NEW_NODE_CREATED";

// Phase 1: Intentional absence signals
export type IntentionalAbsenceSignal =
  | "MANAGER_INTENTIONALLY_ABSENT"
  | "TEAM_INTENTIONALLY_ABSENT";

// Phase 1: Structural integrity signals
export type IntegritySignal =
  | "ORPHAN_POSITION"
  | "CYCLE_DETECTED";

// Phase 5: Intelligence signals
export type IntelligenceSignal =
  | "MANAGEMENT_OVERLOAD"      // Manager has >8 direct reports
  | "MANAGEMENT_UNDERLOAD"     // Manager has <2 direct reports
  | "SINGLE_POINT_FAILURE"     // Team has 1 person with critical skill
  | "OWNERSHIP_GAP"            // Entity has no owner
  | "COVERAGE_GAP"             // No backup for critical role
  | "AVAILABILITY_CRUNCH"      // >50% of team unavailable
  | "SKILL_GAP"                // Required skill not present on team
  | "STALE_DATA";              // Availability data older than threshold

// Combined signal type
export type LoopBrainSignal =
  | StructuralSignal
  | IntentionalAbsenceSignal
  | IntegritySignal
  | IntelligenceSignal;

// Severity levels with priority order
export type SignalSeverity = "critical" | "high" | "medium" | "low" | "info";

// Extended event type with more metadata
export type LoopBrainEvent = {
  type: LoopBrainSignal;
  entityId: string;
  entityType?: "person" | "position" | "team" | "department" | "project" | "skill";
  severity: SignalSeverity;
  context?: Record<string, unknown>;
  occurredAt: Date;
  // Phase 1: Intentionality tracking
  isIntentional?: boolean;
  // Phase 5: Additional metadata
  metadata?: SignalMetadata;
};

// Phase 5: Signal-specific metadata types
export type SignalMetadata = {
  // For MANAGEMENT_OVERLOAD/UNDERLOAD
  directReportCount?: number;
  threshold?: number;
  // For SINGLE_POINT_FAILURE
  skillName?: string;
  personCount?: number;
  // For AVAILABILITY_CRUNCH
  unavailableCount?: number;
  totalCount?: number;
  unavailablePercent?: number;
  // For SKILL_GAP
  missingSkills?: string[];
  teamId?: string;
  teamName?: string;
  // For STALE_DATA
  lastUpdated?: Date;
  staleDays?: number;
  // For CYCLE_DETECTED
  cycleChain?: string[];
  // General
  affectedEntityIds?: string[];
  suggestedAction?: string;
};

/**
 * Signal severity mapping:
 * - critical: Immediate action required (cycles, ownership gaps affecting active projects)
 * - high: Structural gaps that prevent org reasoning (missing manager)
 * - medium: Operational gaps that reduce clarity (missing team, management load)
 * - low: Informational gaps that can be inferred (missing role)
 * - info: Acknowledged/intentional states (not problems)
 */

export const SIGNAL_SEVERITY_MAP: Record<LoopBrainSignal, SignalSeverity> = {
  // Critical
  CYCLE_DETECTED: "critical",
  
  // High
  MISSING_MANAGER: "high",
  ORPHAN_MANAGER: "high",
  MANAGEMENT_OVERLOAD: "high",
  OWNERSHIP_GAP: "high",
  AVAILABILITY_CRUNCH: "high",
  
  // Medium
  MISSING_TEAM: "medium",
  ORPHAN_POSITION: "medium",
  SINGLE_POINT_FAILURE: "medium",
  COVERAGE_GAP: "medium",
  SKILL_GAP: "medium",
  MANAGEMENT_UNDERLOAD: "medium",
  
  // Low
  MISSING_ROLE: "low",
  DUPLICATE_PERSON: "low",
  STALE_DATA: "low",
  
  // Info (intentional states)
  MANAGER_INTENTIONALLY_ABSENT: "info",
  TEAM_INTENTIONALLY_ABSENT: "info",
  STRUCTURE_CHANGED: "info",
  NEW_NODE_CREATED: "info",
};

/**
 * Get severity for a signal type
 */
export function getSignalSeverity(signal: LoopBrainSignal): SignalSeverity {
  return SIGNAL_SEVERITY_MAP[signal] || "medium";
}

/**
 * Create a new LoopBrain event
 */
export function createSignalEvent(
  type: LoopBrainSignal,
  entityId: string,
  options?: {
    entityType?: LoopBrainEvent["entityType"];
    context?: Record<string, unknown>;
    isIntentional?: boolean;
    metadata?: SignalMetadata;
    occurredAt?: Date;
  }
): LoopBrainEvent {
  return {
    type,
    entityId,
    entityType: options?.entityType,
    severity: getSignalSeverity(type),
    context: options?.context,
    isIntentional: options?.isIntentional ?? false,
    metadata: options?.metadata,
    occurredAt: options?.occurredAt ?? new Date(),
  };
}

/**
 * Check if a signal is an intelligence signal (Phase 5)
 */
export function isIntelligenceSignal(signal: LoopBrainSignal): boolean {
  const intelligenceSignals: LoopBrainSignal[] = [
    "MANAGEMENT_OVERLOAD",
    "MANAGEMENT_UNDERLOAD",
    "SINGLE_POINT_FAILURE",
    "OWNERSHIP_GAP",
    "COVERAGE_GAP",
    "AVAILABILITY_CRUNCH",
    "SKILL_GAP",
    "STALE_DATA",
  ];
  return intelligenceSignals.includes(signal);
}

/**
 * Check if a signal represents an intentional state (not a problem)
 */
export function isIntentionalSignal(signal: LoopBrainSignal): boolean {
  return signal === "MANAGER_INTENTIONALLY_ABSENT" || 
         signal === "TEAM_INTENTIONALLY_ABSENT";
}

/**
 * Filter events to only actionable issues (exclude intentional and info-level)
 */
export function getActionableEvents(events: LoopBrainEvent[]): LoopBrainEvent[] {
  return events.filter(e => 
    !e.isIntentional && 
    e.severity !== "info"
  );
}

/**
 * Sort events by severity (critical first)
 */
export function sortEventsBySeverity(events: LoopBrainEvent[]): LoopBrainEvent[] {
  const severityOrder: Record<SignalSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  return [...events].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Group events by entity
 */
export function groupEventsByEntity(
  events: LoopBrainEvent[]
): Map<string, LoopBrainEvent[]> {
  const grouped = new Map<string, LoopBrainEvent[]>();
  for (const event of events) {
    const key = event.entityId;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(event);
  }
  return grouped;
}

/**
 * Count events by signal type
 */
export function countEventsByType(
  events: LoopBrainEvent[]
): Record<LoopBrainSignal, number> {
  const counts: Partial<Record<LoopBrainSignal, number>> = {};
  for (const event of events) {
    counts[event.type] = (counts[event.type] || 0) + 1;
  }
  return counts as Record<LoopBrainSignal, number>;
}

/**
 * Generate a human-readable summary for a signal type
 */
export function getSignalDescription(signal: LoopBrainSignal): string {
  const descriptions: Record<LoopBrainSignal, string> = {
    MISSING_MANAGER: "Person has no manager assigned",
    MISSING_TEAM: "Person has no team assigned",
    MISSING_ROLE: "Person has no role/title assigned",
    ORPHAN_MANAGER: "Manager has no reports and may be misassigned",
    DUPLICATE_PERSON: "Possible duplicate person record detected",
    STRUCTURE_CHANGED: "Organizational structure has been modified",
    NEW_NODE_CREATED: "New person or position was added",
    MANAGER_INTENTIONALLY_ABSENT: "Person intentionally has no manager (e.g., founder, CEO)",
    TEAM_INTENTIONALLY_ABSENT: "Person intentionally has no team (e.g., cross-functional role)",
    ORPHAN_POSITION: "Position exists with no person assigned",
    CYCLE_DETECTED: "Circular reporting chain detected",
    MANAGEMENT_OVERLOAD: "Manager has too many direct reports",
    MANAGEMENT_UNDERLOAD: "Manager has very few direct reports",
    SINGLE_POINT_FAILURE: "Only one person has a critical skill",
    OWNERSHIP_GAP: "Entity has no designated owner",
    COVERAGE_GAP: "No backup coverage for a critical role",
    AVAILABILITY_CRUNCH: "Significant portion of team is unavailable",
    SKILL_GAP: "Required skill is not present on team",
    STALE_DATA: "Data has not been updated recently",
  };
  return descriptions[signal] || "Unknown signal";
}
