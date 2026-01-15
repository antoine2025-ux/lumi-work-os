/**
 * Validation helpers for Org mutation inputs.
 */

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${field}: must be a non-empty string`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

export function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

