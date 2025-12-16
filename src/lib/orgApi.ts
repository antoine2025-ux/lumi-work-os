export const orgApi = {
  create: () => ({
    url: "/api/org/create",
    method: "POST" as const,
    defaultErrorMessage: "Failed to create organization.",
    errorToastTitle: "Could not create organization",
    traceLabel: "OrgCreate",
  }),

  update: () => ({
    url: "/api/org/update",
    method: "POST" as const,
    defaultErrorMessage: "Failed to update organization.",
    errorToastTitle: "Could not update organization",
    traceLabel: "OrgUpdate",
  }),

  inviteCreate: () => ({
    url: "/api/org/invitations/create",
    method: "POST" as const,
    defaultErrorMessage: "Failed to send invitation.",
    errorToastTitle: "Could not send invitation",
    traceLabel: "OrgInviteCreate",
  }),

  inviteCancel: () => ({
    url: "/api/org/invitations/cancel",
    method: "POST" as const,
    defaultErrorMessage: "Failed to cancel invitation.",
    errorToastTitle: "Could not cancel invitation",
    traceLabel: "OrgInviteCancel",
  }),

  memberUpdateRole: () => ({
    url: "/api/org/members/update-role",
    method: "POST" as const,
    defaultErrorMessage: "Failed to update role.",
    errorToastTitle: "Could not update role",
    traceLabel: "OrgMemberUpdateRole",
  }),

  memberRemove: () => ({
    url: "/api/org/members/remove",
    method: "POST" as const,
    defaultErrorMessage: "Failed to remove member.",
    errorToastTitle: "Could not remove member",
    traceLabel: "OrgMemberRemove",
  }),

  memberLeave: () => ({
    url: "/api/org/members/leave",
    method: "POST" as const,
    defaultErrorMessage: "Failed to leave organization.",
    errorToastTitle: "Could not leave organization",
    traceLabel: "OrgLeave",
  }),

  ownershipTransfer: () => ({
    url: "/api/org/ownership/transfer",
    method: "POST" as const,
    defaultErrorMessage: "Failed to transfer ownership.",
    errorToastTitle: "Could not transfer ownership",
    traceLabel: "OrgOwnershipTransfer",
  }),

  deleteOrg: () => ({
    url: "/api/org/delete",
    method: "POST" as const,
    defaultErrorMessage: "Failed to delete organization.",
    errorToastTitle: "Could not delete organization",
    traceLabel: "OrgDelete",
  }),
};

