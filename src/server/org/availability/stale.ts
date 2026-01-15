/**
 * Availability staleness helper.
 * 
 * Determines if availability data is stale based on last update time.
 */

/**
 * Check if availability data is stale.
 * @param availabilityUpdatedAt - The timestamp when availability was last updated
 * @param days - Number of days after which data is considered stale (default: 14)
 * @returns true if the data is stale, false otherwise
 */
export function isAvailabilityStale(
  availabilityUpdatedAt: Date | null,
  days: number = 14
): boolean {
  if (!availabilityUpdatedAt) return false;
  const ms = Date.now() - availabilityUpdatedAt.getTime();
  const staleMs = days * 24 * 60 * 60 * 1000;
  return ms > staleMs;
}

