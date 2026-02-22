"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { teardownWorkspaceSession } from "@/lib/workspace-teardown";
import { useToast } from "@/components/ui/use-toast";
import { useApiAction } from "@/hooks/useApiAction";
import { orgApi } from "@/lib/orgApi";

type DangerZoneProps = {
  workspaceId: string;
  workspaceName?: string | null;
  isOwner: boolean;
  transferTargets: {
    membershipId: string;
    label: string;
  }[];
};

export function DangerZone({
  workspaceId,
  workspaceName,
  isOwner,
  transferTargets,
}: DangerZoneProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedMembershipId, setSelectedMembershipId] = useState<string | "">(
    transferTargets[0]?.membershipId ?? ""
  );
  const [transferring, setTransferring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const transferAction = useApiAction<
    Record<string, never>,
    { workspaceId: string; targetMembershipId: string }
  >(orgApi.ownershipTransfer());

  const deleteAction = useApiAction<Record<string, never>, { workspaceId: string }>(
    orgApi.deleteOrg()
  );

  async function handleTransferOwnership() {
    if (!isOwner) {
      toast({
        variant: "destructive",
        title: "Not allowed",
        description: "Only the current owner can transfer ownership.",
      });

      return;
    }

    if (!selectedMembershipId) {
      toast({
        variant: "destructive",
        title: "No target selected",
        description: "Choose an admin to transfer ownership to.",
      });

      return;
    }

    if (transferring || deleting) return;

    const confirmed = window.confirm(
      "Are you sure you want to transfer ownership of this workspace? You will no longer be the owner."
    );
    if (!confirmed) return;

    setTransferring(true);
    try {
      const { error } = await transferAction.run({
        workspaceId,
        targetMembershipId: selectedMembershipId,
      });

      if (error) {
        return;
      }

      toast({
        title: "Ownership transferred",
        description: "Ownership has been transferred to the selected admin.",
      });

      router.refresh();
    } finally {
      setTransferring(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (!isOwner) {
      toast({
        variant: "destructive",
        title: "Not allowed",
        description: "Only the owner can delete this workspace.",
      });

      return;
    }

    if (deleting || transferring) return;

    const name = workspaceName || "this workspace";

    const confirmed = window.confirm(
      `This will permanently delete ${name} and all of its data for all members.\n\nThis action cannot be undone.\n\nType "DELETE" in the prompt that follows to confirm.`
    );

    if (!confirmed) return;

    const phrase = window.prompt(
      'To confirm deletion, type "DELETE" (in all caps) below:'
    );

    if (phrase !== "DELETE") {
      toast({
        variant: "destructive",
        title: "Deletion cancelled",
        description: "You did not type DELETE exactly.",
      });

      return;
    }

    setDeleting(true);
    try {
      const { error } = await deleteAction.run({ workspaceId });

      if (error) {
        return;
      }

      toast({
        title: "Workspace deleted",
        description: "The workspace and its data have been removed.",
      });

      // Deterministic teardown: clears all client-side state sources
      // (logout flag, React Query, localStorage, sessionStorage, JWT)
      // and hard-redirects to /login.
      await teardownWorkspaceSession(queryClient);
    } finally {
      setDeleting(false);
    }
  }

  const name = workspaceName || "this workspace";

  return (
    <section className="mt-8 border border-destructive/40 bg-destructive/5 rounded-lg p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
        <p className="text-xs text-muted-foreground mt-1">
          These actions can significantly impact your workspace and its members. Proceed with
          caution.
        </p>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Transfer ownership</span>
            <span className="text-xs text-muted-foreground">
              Transfer ownership of {name} to another admin. You will remain a member, but you will no longer be the owner.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="text-xs rounded-md border px-2 py-1 bg-background"
              value={selectedMembershipId}
              disabled={!isOwner || transferring || deleting || transferTargets.length === 0}
              onChange={(e) => setSelectedMembershipId(e.target.value)}
            >
              {transferTargets.length === 0 ? (
                <option value="">No other admins available</option>
              ) : (
                transferTargets.map((target) => (
                  <option key={target.membershipId} value={target.membershipId}>
                    {target.label}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={handleTransferOwnership}
              disabled={
                !isOwner ||
                !selectedMembershipId ||
                transferring ||
                deleting ||
                transferTargets.length === 0
              }
              className="text-xs px-2 py-1 border rounded-md hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
            >
              {transferring ? "Transferring…" : "Transfer"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-destructive">
              Delete workspace
            </span>
            <span className="text-xs text-muted-foreground">
              Permanently delete {name}, including its workspaces, members, and data.
              This action cannot be undone for anyone.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDeleteWorkspace}
            disabled={!isOwner || deleting || transferring}
            className="text-xs px-3 py-1.5 border border-destructive rounded-md text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete workspace"}
          </button>
        </div>
      </div>

      {!isOwner && (
        <p className="text-[11px] text-muted-foreground border-t pt-3">
          Only the workspace owner can transfer ownership or delete the workspace. Ask your owner if you need changes here.
        </p>
      )}
    </section>
  );
}

