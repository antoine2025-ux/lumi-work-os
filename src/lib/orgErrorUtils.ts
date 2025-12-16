/**
 * Best-effort detection for org access errors from Org Center hooks.
 * Hooks surface `json.error.message` from the backend, e.g.
 * "You don't have access to this organization."
 */
export function isOrgNoAccessError(message: string | null | undefined): boolean {
  if (!message) return false;

  const lower = message.toLowerCase();

  return (
    lower.includes("don't have access to this organization") ||
    lower.includes("don't have access to this organization") ||
    lower.includes("dont have access to this organization")
  );
}

