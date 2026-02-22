/**
 * Org Completeness Derivation
 * 
 * Single canonical source for computing org completeness percentages.
 * Used by People, Overview, Executive views.
 * 
 * Golden Rule: Derived, Not Stored
 */

export type OrgCompleteness = {
  reportingLines: number;
  teams: number;
  roles: number;
};

type CompletenessPerson = {
  managerId?: string | null;
  team?: string | null;
  teamName?: string | null;
  teamId?: string | null;
  role?: string | null;
  title?: string | null;
};

export function deriveCompleteness(people: CompletenessPerson[]): OrgCompleteness {
  if (people.length === 0) {
    return { reportingLines: 0, teams: 0, roles: 0 };
  }

  const total = people.length;

  const withManager = people.filter(p => !!p.managerId).length;
  const withTeam = people.filter(p => !!(p.team || p.teamName || p.teamId)).length;
  const withRole = people.filter(p => !!(p.role || p.title)).length;

  return {
    reportingLines: Math.round((withManager / total) * 100),
    teams: Math.round((withTeam / total) * 100),
    roles: Math.round((withRole / total) * 100),
  };
}

