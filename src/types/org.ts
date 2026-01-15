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
  fullName?: string | null; // From API, may be more reliable than name
  email: string;
  title?: string | null; // Job title
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
  ownerPersonId: string | null;
  memberCount: number;
};

export type StructureDepartment = {
  id: string;
  name: string;
  ownerPersonId: string | null;
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

