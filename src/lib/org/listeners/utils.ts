/**
 * Activity Listener Utility Functions
 * 
 * Helper functions for activity tracking and relationship building.
 */

// =============================================================================
// Week Calculation
// =============================================================================

/**
 * Get the start of the current week (Monday 00:00 UTC).
 * PersonActivityMetric tracks metrics on a weekly basis.
 */
export function getWeekStarting(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday (0), go back 6 days, else go to Monday
  
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  
  return monday;
}

// =============================================================================
// Completion Time Calculation
// =============================================================================

/**
 * Calculate the number of calendar days between two dates.
 * Used to track task completion time.
 */
export function calculateCompletionDays(createdAt: Date, completedAt: Date): number {
  const diffMs = completedAt.getTime() - createdAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(diffDays * 10) / 10); // Round to 1 decimal place
}

// =============================================================================
// Person ID Ordering
// =============================================================================

/**
 * Sort two person IDs to ensure canonical ordering for relationships.
 * PersonRelationship stores personAId < personBId to avoid duplicate pairs.
 * 
 * @returns [smallerId, largerId]
 */
export function sortPersonIds(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

// =============================================================================
// Relationship Strength Calculation
// =============================================================================

/**
 * Calculate relationship strength based on interaction counts.
 * Formula: (meetingsShared * 0.4 + projectsShared * 0.3 + tasksShared * 0.2 + wikisShared * 0.1) / 10
 * Normalized to 0.0-1.0 range.
 */
export function calculateRelationshipStrength(
  meetingsShared: number,
  projectsShared: number,
  tasksShared: number,
  wikisShared: number
): number {
  const rawScore = (
    meetingsShared * 0.4 +
    projectsShared * 0.3 +
    tasksShared * 0.2 +
    wikisShared * 0.1
  ) / 10;
  
  // Clamp to 0-1 range
  return Math.min(1.0, Math.max(0.0, rawScore));
}

// =============================================================================
// Relationship Type Inference
// =============================================================================

export type RelationshipType = "COLLABORATOR" | "REPORTS_TO" | "PEER" | "CROSS_TEAM";

/**
 * Infer relationship type based on org structure.
 * This is a placeholder - full implementation would query org structure.
 * 
 * For now, default to COLLABORATOR. Future enhancement would:
 * - Query person positions to check if same team → PEER
 * - Query reporting structure to check if one reports to other → REPORTS_TO
 * - Otherwise → COLLABORATOR or CROSS_TEAM
 */
export function inferRelationshipType(
  _personAId: string,
  _personBId: string
): RelationshipType {
  // TODO: Implement org structure lookup
  // For now, default to COLLABORATOR
  return "COLLABORATOR";
}

// =============================================================================
// Rolling Average Calculation
// =============================================================================

/**
 * Calculate a new rolling average when adding a new value.
 * Used for avgCompletionDays in PersonActivityMetric.
 */
export function calculateRollingAverage(
  currentAvg: number | null,
  currentCount: number,
  newValue: number
): number {
  if (currentCount === 0 || currentAvg === null) {
    return newValue;
  }
  
  return (currentAvg * currentCount + newValue) / (currentCount + 1);
}
