/**
 * Normalized data types for Organization Structure views
 * These types provide a consistent view model for both List and Tree views
 */

export type OrgStructureTeam = {
  id: string;
  name: string;
  peopleCount: number;
  lead?: {
    id: string;
    name: string;
    initials: string;
  } | null;
  href?: string; // link to the team page if available
};

export type OrgStructureDepartment = {
  id: string;
  name: string;
  teamsCount: number;
  peopleCount: number;
  teams: OrgStructureTeam[];
};

