"use client";

import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { InviteMemberForm } from "@/components/org/invite-member-form";
import { CancelInvitationButton } from "@/components/org/cancel-invitation-button";
import { CopyInviteLinkButton } from "@/components/org/copy-invite-link-button";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

type Invitation = {
  id: string;
  email: string;
  status: string;
  token?: string;
  inviteUrl?: string;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  invitedBy?: { name?: string | null; email?: string | null } | null;
};

type InvitesSectionProps = {
  orgId?: string;
  initialInvitations?: Invitation[];
};

/**
 * Org Center → Settings → Invites tab.
 *
 * Renders invitations using data loaded server-side to avoid Server Component issues.
 */
export function InvitesSection({
  orgId,
  initialInvitations = [],
}: InvitesSectionProps) {
  const perms = useOrgPermissions();

  if (!orgId) {
    return (
      <div className="rounded-2xl border border-[#111827] bg-[#020617] p-4 text-xs text-slate-400">
        No organization selected.
      </div>
    );
  }

  const activeInvites = initialInvitations.filter(
    (invitation) => invitation.status === "PENDING"
  );
  const historyInvites = initialInvitations.filter(
    (invitation) => invitation.status !== "PENDING"
  );

  return (
    <OrgCapabilityGate
      capability="org:member:invite"
      permissions={perms}
      fallback={
        <div className="rounded-2xl border border-[#111827] bg-[#020617] p-4 text-xs text-slate-300">
          You don&apos;t have permission to view or send invites in this org.
        </div>
      }
    >
      <section className="rounded-2xl border border-[#111827] bg-[#020617] p-4 shadow-sm">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            Invitations
          </p>
        </div>

        {activeInvites.length === 0 && historyInvites.length === 0 ? (
          <OrgEmptyState
            title="No invitations yet"
            description="Use the form below to invite people to this organization."
            primaryActionLabel="Invite member"
            primaryAction={<InviteMemberForm workspaceId={orgId} />}
          />
        ) : (
          <div className="space-y-4">
            {activeInvites.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Active invitations</h4>
                <ul className="space-y-2">
                  {activeInvites.map((invitation) => (
                    <li
                      key={invitation.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{invitation.email}</span>
                        <span className="text-xs text-slate-500">
                          Invited by{" "}
                          {invitation.invitedBy?.name ||
                            invitation.invitedBy?.email ||
                            "Unknown"}
                        </span>
                        {invitation.expiresAt && (
                          <span className="text-xs text-slate-500">
                            Expires on{" "}
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                          Pending
                        </span>
                        <CopyInviteLinkButton
                          token={invitation.token ?? ""}
                          inviteUrl={invitation.inviteUrl}
                        />
                        <CancelInvitationButton
                          workspaceId={orgId}
                          invitationId={invitation.id}
                          email={invitation.email}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {historyInvites.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Invitation history</h4>
                <ul className="space-y-2">
                  {historyInvites.map((invitation) => (
                    <li
                      key={invitation.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{invitation.email}</span>
                        <span className="text-xs text-slate-500">
                          Invited by{" "}
                          {invitation.invitedBy?.name ||
                            invitation.invitedBy?.email ||
                            "Unknown"}
                        </span>
                        {invitation.acceptedAt && (
                          <span className="text-xs text-slate-500">
                            Accepted on{" "}
                            {new Date(invitation.acceptedAt).toLocaleDateString()}
                          </span>
                        )}
                        {invitation.expiresAt && invitation.status === "EXPIRED" && (
                          <span className="text-xs text-slate-500">
                            Expired on{" "}
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            invitation.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {invitation.status === "PENDING"
                            ? "Pending"
                            : invitation.status === "ACCEPTED"
                            ? "Accepted"
                            : invitation.status === "EXPIRED"
                            ? "Expired"
                            : invitation.status === "REJECTED"
                            ? "Cancelled"
                            : invitation.status.toLowerCase()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <InviteMemberForm workspaceId={orgId} />
            </div>
          </div>
        )}
      </section>
    </OrgCapabilityGate>
  );
}
