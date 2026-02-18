export type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

export type OrgCapability =
  // View & general access
  | "org:view"
  | "org:overview:view"
  | "org:people:view"
  | "org:structure:view"
  | "org:chart:view"
  | "org:activity:view"
  | "org:insights:view"
  | "org:settings:view"
  | "org:settings:manage"
  | "org:structure:write"
  // People / membership
  | "org:member:list"
  | "org:member:invite"
  | "org:member:remove"
  | "org:member:role.change"
  // Teams
  | "org:team:create"
  | "org:team:update"
  | "org:team:delete"
  // Departments
  | "org:department:create"
  | "org:department:update"
  | "org:department:delete"
  // Roles
  | "org:role:create"
  | "org:role:update"
  | "org:role:delete"
  // Activity & exports
  | "org:activity:export"
  // Org-level admin
  | "org:org:update"
  | "org:org:delete";

export const ORG_CAPABILITIES_READONLY: OrgCapability[] = [
  "org:view",
  "org:overview:view",
  "org:people:view",
  "org:structure:view",
  "org:chart:view",
  "org:activity:view",
  "org:settings:view",
  "org:member:list",
];

export const ORG_CAPABILITIES_ADMIN: OrgCapability[] = [
  ...ORG_CAPABILITIES_READONLY,
  "org:member:invite",
  "org:member:remove",
  "org:team:create",
  "org:team:update",
  "org:department:create",
  "org:department:update",
  "org:role:create",
  "org:role:update",
  "org:insights:view",
  "org:activity:export",
  "org:org:update",
];

export const ORG_CAPABILITIES_OWNER: OrgCapability[] = [
  ...ORG_CAPABILITIES_ADMIN,
  "org:member:role.change",
  "org:team:delete",
  "org:department:delete",
  "org:role:delete",
  "org:org:delete",
];

export function getOrgCapabilitiesForRole(role: OrgRole): OrgCapability[] {
  switch (role) {
    case "OWNER":
      return ORG_CAPABILITIES_OWNER;
    case "ADMIN":
      return ORG_CAPABILITIES_ADMIN;
    case "MEMBER":
    default:
      return ORG_CAPABILITIES_READONLY;
  }
}

export function hasOrgCapability(
  role: OrgRole,
  capability: OrgCapability
): boolean {
  return getOrgCapabilitiesForRole(role).includes(capability);
}

type OrgCapabilityCheckInput = {
  role: OrgRole;
  capabilities: OrgCapability[];
};

export function hasAllOrgCapabilities(input: OrgCapabilityCheckInput): boolean {
  const { role, capabilities } = input;
  const granted = getOrgCapabilitiesForRole(role);
  return capabilities.every((c) => granted.includes(c));
}

export function hasAnyOrgCapability(input: OrgCapabilityCheckInput): boolean {
  const { role, capabilities } = input;
  const granted = getOrgCapabilitiesForRole(role);
  return capabilities.some((c) => granted.includes(c));
}

/**
 * Capability descriptions for UI display.
 * These help explain what each capability allows users to do.
 */
export const ORG_CAPABILITY_DESCRIPTIONS: Record<OrgCapability, string> = {
  "org:view": "View the organization and all non-sensitive information.",
  "org:overview:view": "View the organization overview page.",
  "org:people:view": "View the people directory and member lists.",
  "org:structure:view": "View teams, departments, and roles structure.",
  "org:chart:view": "View the organization chart.",
  "org:activity:view": "View admin activity history and audit logs.",
  "org:insights:view": "View organization insights and analytics.",
  "org:settings:view": "View organization settings pages.",
  "org:settings:manage": "Manage organization settings and configuration.",
  "org:structure:write": "Create and modify organizational structure.",
  "org:member:list": "List and view organization members.",
  "org:member:invite": "Invite new members to the organization.",
  "org:member:remove": "Remove members from the organization.",
  "org:member:role.change": "Change member roles (e.g., promote to Admin).",
  "org:team:create": "Create new teams.",
  "org:team:update": "Update existing teams.",
  "org:team:delete": "Delete teams.",
  "org:department:create": "Create new departments.",
  "org:department:update": "Update existing departments.",
  "org:department:delete": "Delete departments.",
  "org:role:create": "Create new roles.",
  "org:role:update": "Update existing roles.",
  "org:role:delete": "Delete roles.",
  "org:activity:export": "Download org audit logs as CSV or JSON.",
  "org:org:update": "Update organization settings and configuration.",
  "org:org:delete": "Delete the entire organization.",
};

/**
 * Role → Capabilities matrix for UI display.
 * Maps each role to a record of capability → boolean.
 */
export const ROLE_CAPABILITIES: Record<OrgRole, Record<OrgCapability, boolean>> = {
  OWNER: {} as Record<OrgCapability, boolean>,
  ADMIN: {} as Record<OrgCapability, boolean>,
  MEMBER: {} as Record<OrgCapability, boolean>,
};

// Initialize the matrix
const allCapabilities: OrgCapability[] = [
  "org:view",
  "org:overview:view",
  "org:people:view",
  "org:structure:view",
  "org:chart:view",
  "org:activity:view",
  "org:insights:view",
  "org:settings:view",
  "org:settings:manage",
  "org:structure:write",
  "org:member:list",
  "org:member:invite",
  "org:member:remove",
  "org:member:role.change",
  "org:team:create",
  "org:team:update",
  "org:team:delete",
  "org:department:create",
  "org:department:update",
  "org:department:delete",
  "org:role:create",
  "org:role:update",
  "org:role:delete",
  "org:activity:export",
  "org:org:update",
  "org:org:delete",
];

for (const capability of allCapabilities) {
  ROLE_CAPABILITIES.OWNER[capability] = hasOrgCapability("OWNER", capability);
  ROLE_CAPABILITIES.ADMIN[capability] = hasOrgCapability("ADMIN", capability);
  ROLE_CAPABILITIES.MEMBER[capability] = hasOrgCapability("MEMBER", capability);
}

/**
 * Effective capabilities combining base role + custom role.
 * Used when a membership has both a system role and an optional custom role.
 */
export type OrgEffectiveCapabilities = {
  base: Set<OrgCapability>;
  custom: Set<OrgCapability>;
  combined: Set<OrgCapability>;
};

export function getBaseCapabilities(role: OrgRole): Set<OrgCapability> {
  const caps = getOrgCapabilitiesForRole(role);
  return new Set(caps);
}

export function getEffectiveCapabilities(
  role: OrgRole,
  customRole?: { capabilities: OrgCapability[] }
): OrgEffectiveCapabilities {
  const base = getBaseCapabilities(role);
  const custom = new Set<OrgCapability>(customRole?.capabilities ?? []);
  const combined = new Set<OrgCapability>([...base, ...custom]);
  return { base, custom, combined };
}

/**
 * Helper to list combined capabilities as an array (for UI use).
 */
export function listCombinedCapabilities(
  role: OrgRole,
  customRole?: { capabilities: OrgCapability[] }
): OrgCapability[] {
  const effective = getEffectiveCapabilities(role, customRole);
  return Array.from(effective.combined);
}

/**
 * Capability groups for UI organization.
 * Helps group capabilities by functional area.
 */
export const ORG_CAPABILITY_GROUPS: {
  id: string;
  label: string;
  capabilities: OrgCapability[];
}[] = [
  {
    id: "people",
    label: "People & membership",
    capabilities: [
      "org:people:view",
      "org:member:list",
      "org:member:invite",
      "org:member:remove",
      "org:member:role.change",
    ].filter(Boolean) as OrgCapability[],
  },
  {
    id: "structure",
    label: "Structure (teams, departments, roles)",
    capabilities: [
      "org:structure:view",
      "org:team:create",
      "org:team:update",
      "org:team:delete",
      "org:department:create",
      "org:department:update",
      "org:department:delete",
      "org:role:create",
      "org:role:update",
      "org:role:delete",
    ].filter(Boolean) as OrgCapability[],
  },
  {
    id: "settings",
    label: "Org settings & configuration",
    capabilities: [
      "org:settings:view",
      "org:org:update",
      "org:org:delete",
    ].filter(Boolean) as OrgCapability[],
  },
  {
    id: "insights",
    label: "Insights & reporting",
    capabilities: [
      "org:insights:view",
    ].filter(Boolean) as OrgCapability[],
  },
  {
    id: "activity",
    label: "Activity & audits",
    capabilities: [
      "org:activity:view",
      "org:activity:export",
    ].filter(Boolean) as OrgCapability[],
  },
  {
    id: "view",
    label: "View access",
    capabilities: [
      "org:view",
      "org:overview:view",
      "org:chart:view",
    ].filter(Boolean) as OrgCapability[],
  },
];

