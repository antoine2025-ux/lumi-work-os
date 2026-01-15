// src/lib/org/healthTypes.ts

export type OrgRoleRiskSummary = {
  rolesWithoutOwner: number;
  rolesWithoutResponsibilities: number;
  rolesWithoutTeam: number;
  rolesWithoutDepartment: number;
};

export type OrgRoleRiskDetails = {
  rolesWithoutOwner: { id: string; title: string }[];
  rolesWithoutResponsibilities: { id: string; title: string }[];
  rolesWithoutTeam: { id: string; title: string }[];
  rolesWithoutDepartment: { id: string; title: string }[];
};

export type OrgHealthRoles = {
  summary: OrgRoleRiskSummary;
  details: OrgRoleRiskDetails;
};

export type OrgHealth = {
  score: number;
  label: string;
  orgShape: {
    depth: number;
    centralized: boolean;
  };
  spanOfControl: {
    overloadedManagers: number;
    underloadedManagers: number;
  };
  teamBalance: {
    singlePointTeams: number;
    largestTeamSize: number;
  };
  roles: OrgHealthRoles;
};

