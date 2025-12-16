export type OrgPermissionLevel = "OWNER" | "ADMIN" | "MEMBER";

export type OrgPermissionCapabilityKey =
  | "manageStructure"
  | "manageInvites"
  | "manageOrgSettings"
  | "viewActivityExports"
  | "managePeople"
  | "viewOrgCenter";

export type OrgPermissionCapability = {
  key: OrgPermissionCapabilityKey;
  label: string;
  description: string;
};

export const ORG_CAPABILITIES: OrgPermissionCapability[] = [
  {
    key: "viewOrgCenter",
    label: "View Org Center",
    description: "Access Org overview, people, structure, org chart, and activity.",
  },
  {
    key: "managePeople",
    label: "Manage people",
    description: "Invite, remove, or change roles of members in the org.",
  },
  {
    key: "manageStructure",
    label: "Manage structure",
    description: "Create or edit teams, departments, and role definitions.",
  },
  {
    key: "manageInvites",
    label: "Manage invites",
    description: "Create, resend, or revoke invitations to the org.",
  },
  {
    key: "manageOrgSettings",
    label: "Manage org settings",
    description: "Update org-level settings like name, billing contact, and integrations.",
  },
  {
    key: "viewActivityExports",
    label: "View activity & exports",
    description: "See the full activity log and export audit data.",
  },
];

// Simple default mapping for now – later we can make this org-configurable.
export function canRole(perm: OrgPermissionLevel, capability: OrgPermissionCapabilityKey): boolean {
  if (perm === "OWNER") {
    return true;
  }

  if (perm === "ADMIN") {
    return [
      "viewOrgCenter",
      "managePeople",
      "manageStructure",
      "manageInvites",
      "viewActivityExports",
    ].includes(capability);
  }

  // MEMBER: more limited
  return [
    "viewOrgCenter",
    "viewActivityExports",
  ].includes(capability);
}

