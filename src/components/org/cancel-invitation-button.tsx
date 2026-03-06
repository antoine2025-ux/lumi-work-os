"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useApiAction } from "@/hooks/useApiAction";
import { orgApi } from "@/lib/orgApi";

type CancelInvitationButtonProps = {
  workspaceId: string;
  invitationId: string;
  email: string;
  onSuccess?: () => void;
};

export function CancelInvitationButton({
  workspaceId,
  invitationId,
  email,
  onSuccess,
}: CancelInvitationButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const cancelInviteAction = useApiAction<
    Record<string, never>,
    { workspaceId: string; invitationId: string }
  >(orgApi.inviteCancel());

  async function handleClick() {
    if (loading || cancelInviteAction.loading) return;
    setLoading(true);

    try {
      const { error } = await cancelInviteAction.run({
        workspaceId,
        invitationId,
      });

      if (error) {
        return;
      }

      toast({
        title: "Invitation cancelled",
        description: `The invite for ${email} has been cancelled.`,
      });

      onSuccess?.();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="text-xs px-2 py-1 border rounded-md hover:bg-muted disabled:opacity-60"
      onClick={handleClick}
      disabled={loading || cancelInviteAction.loading}
    >
      {loading || cancelInviteAction.loading ? "Cancelling…" : "Cancel"}
    </button>
  );
}

