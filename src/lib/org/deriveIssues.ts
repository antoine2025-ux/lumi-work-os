/**
 * Org Issues Derivation
 * 
 * Deterministic issue derivation from org state.
 * No storage, no mutation, no prioritization.
 * 
 * Golden Rule: Problems Are Views, Not States
 */

export type OrgIssue =
  | "MISSING_MANAGER"
  | "MISSING_TEAM"
  | "MISSING_ROLE";

export type PersonIssues = {
  personId: string;
  issues: OrgIssue[];
};

export function deriveIssues(people: any[]): PersonIssues[] {
  return people
    .map(p => {
      const issues: OrgIssue[] = [];
      if (!p.managerId) issues.push("MISSING_MANAGER");
      if (!p.team && !p.teamName && !p.teamId) issues.push("MISSING_TEAM");
      if (!p.role && !p.title) issues.push("MISSING_ROLE");

      return {
        personId: p.id,
        issues,
      };
    })
    .filter(r => r.issues.length > 0);
}

