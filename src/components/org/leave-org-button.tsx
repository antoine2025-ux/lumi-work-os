"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useApiAction } from "@/hooks/useApiAction";
import { orgApi } from "@/lib/orgApi";

type LeaveOrgButtonProps = {
  workspaceId: string;
  workspaceName?: string | null;
};

export function LeaveOrgButton({ workspaceId, workspaceName }: LeaveOrgButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [leaving, setLeaving] = useState(false);

  const leaveAction = useApiAction<Record<string, never>, { workspaceId: string }>(
    orgApi.memberLeave()
  );

  async function handleLeave() {
    if (leaving) return;

    const name = workspaceName || "this workspace";

    const confirmed = window.confirm(
      `Are you sure you want to leave ${name}? You will lose access to this organization and its workspaces.`
    );
    if (!confirmed) return;

    setLeaving(true);
    try {
      const { error } = await leaveAction.run({ workspaceId });

      if (error) {
        return;
      }

      toast({
        title: "You left the workspace",
        description: "You no longer have access to this workspace.",
      });

      // Redirect away from this workspace dashboard.
      router.push("/home");
      router.refresh();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLeave}
      disabled={leaving}
      className="text-xs px-2 py-1 border rounded-md hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
    >
      {leaving ? "Leaving…" : "Leave organization"}
    </button>
  );
}

