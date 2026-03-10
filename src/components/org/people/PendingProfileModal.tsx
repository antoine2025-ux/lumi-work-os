"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyInviteLinkButton } from "@/components/org/copy-invite-link-button";
import { CancelInvitationButton } from "@/components/org/cancel-invitation-button";
import { Mail } from "lucide-react";

export type PendingInvitation = {
  id: string;
  email: string;
  fullName?: string | null;
  status: string;
  token?: string | null;
  inviteUrl?: string | null;
  expiresAt?: Date | string | null;
  title?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  managerId?: string | null;
  jobDescriptionId?: string | null;
  invitedBy?: { id?: string | null; name?: string | null; email?: string | null } | null;
  departmentName?: string | null;
  teamName?: string | null;
  managerName?: string | null;
  jobDescriptionTitle?: string | null;
};

type PendingProfileModalProps = {
  invitation: PendingInvitation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  onCancelSuccess?: () => void;
};

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function PendingProfileModal({
  invitation,
  open,
  onOpenChange,
  workspaceId,
  onCancelSuccess,
}: PendingProfileModalProps) {
  if (!invitation) return null;

  const hasFullName = !!invitation.fullName?.trim();
  const displayName = invitation.fullName?.trim() || invitation.email;
  const inviterName =
    invitation.invitedBy?.name ?? invitation.invitedBy?.email ?? "Unknown";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
              <Mail className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-foreground">
                Pending profile
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Will apply when they accept the invitation
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-1 mt-4">
          {hasFullName && <ProfileRow label="Name" value={displayName} />}
          <ProfileRow label="Email" value={invitation.email} />
          <ProfileRow label="Position" value={invitation.title ?? undefined} />
          <ProfileRow label="Department" value={invitation.departmentName ?? undefined} />
          <ProfileRow label="Team" value={invitation.teamName ?? undefined} />
          <ProfileRow label="Reports to" value={invitation.managerName ?? undefined} />
          <ProfileRow
            label="Job description"
            value={invitation.jobDescriptionTitle ?? undefined}
          />
          <ProfileRow label="Invited by" value={inviterName} />
          {invitation.expiresAt && (
            <ProfileRow
              label="Expires"
              value={new Date(invitation.expiresAt).toLocaleDateString()}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border">
          <CopyInviteLinkButton
            token={invitation.token ?? ""}
            inviteUrl={invitation.inviteUrl}
          />
          {workspaceId && (
            <CancelInvitationButton
              workspaceId={workspaceId}
              invitationId={invitation.id}
              email={invitation.email}
              onSuccess={() => {
                onOpenChange(false);
                onCancelSuccess?.();
              }}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
