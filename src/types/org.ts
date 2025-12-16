// Shared Org types for Org Center (used in API routes + hooks)

import type { OrgPermissionLevel } from "@/lib/orgPermissions";

export type OrgSummary = {
  id: string;
  name: string;
  slug?: string | null;
  // Optional current member role if the backend chooses to embed it
  currentMemberRole?: OrgPermissionLevel | null;
  // Allow additional fields without tightening too much
  [key: string]: any;
};

export type OrgPerson = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  teamId: string | null;
  team: string | null;
  departmentId: string | null;
  department: string | null;
  location: string | null;
  joinedAt?: string; // ISO date string, optional for backward compatibility
};

export type StructureTeam = {
  id: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  leadName: string | null;
  memberCount: number;
};

export type StructureDepartment = {
  id: string;
  name: string;
  teamCount: number;
};

export type StructureRole = {
  id: string;
  name: string;
  level: string | null;
  defaultTeamName: string | null;
  activePeopleCount: number;
};

export type OrgAdminActivityItem = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: any | null;
  createdAt: string;
  actor: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
};

