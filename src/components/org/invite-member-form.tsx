"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useApiAction } from "@/hooks/useApiAction";
import { orgApi } from "@/lib/orgApi";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";

type InviteMemberFormProps = {
  workspaceId: string;
};

export function InviteMemberForm({ workspaceId }: InviteMemberFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const perms = useOrgPermissions();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteAction = useApiAction<
    { invitation: any },
    { workspaceId: string; email: string }
  >(orgApi.inviteCreate());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: actionError } = await inviteAction.run({
        workspaceId,
        email: email.trim(),
      });

      if (actionError) {
        setError(actionError.message ?? "Failed to send invitation.");
        return;
      }

      const invitedEmail = email.trim();
      setEmail("");
      setError(null);

      toast({
        title: "Invitation sent",
        description: `We sent an invitation to ${invitedEmail}.`,
      });

      // Trigger a refresh so the "Pending invitations" list is up to date.
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OrgCapabilityGate
      capability="org:member:invite"
      permissions={perms}
      fallback={null}
    >
      <div className="border p-4 rounded-lg">
        <h3 className="font-medium mb-2">Invite Member</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <input
              type="email"
              name="email"
              placeholder="person@company.com"
              className="border p-2 rounded w-full text-sm"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send Invitation"}
          </button>
        </form>
      </div>
    </OrgCapabilityGate>
  );
}

