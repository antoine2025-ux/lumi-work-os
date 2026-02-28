/**
 * Diff helper for audit log change tracking.
 * Compares specified fields between before and after states.
 */

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Compute field-level changes between before and after states.
 * Only compares the specified fields.
 *
 * @returns Record of changed fields with { from, to } or null if no changes
 */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const field of fields) {
    const fromVal = before[field];
    const toVal = after[field];
    if (!isEqual(fromVal, toVal)) {
      changes[field] = { from: fromVal, to: toVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
