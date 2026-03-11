"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

type CopyInviteLinkButtonProps = {
  token: string;
  inviteUrl?: string | null;
};

export function CopyInviteLinkButton({
  token,
  inviteUrl,
}: CopyInviteLinkButtonProps) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  async function handleCopy() {
    if (copying) return;
    setCopying(true);

    try {
      const fallbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/invite/${token}`
          : `/invite/${token}`;

      const urlToCopy = inviteUrl || fallbackUrl;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(urlToCopy);
      } else {
        // Very old browsers: create a temporary textarea.
        const textarea = document.createElement("textarea");
        textarea.value = urlToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      toast({
        title: "Invite link copied",
        description: "You can now paste the link to share the invitation.",
      });
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Could not copy link",
        description: "Please try again or copy the URL manually.",
      });
    } finally {
      setCopying(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={copying}
      className="text-xs px-2 py-1 border rounded-md hover:bg-muted disabled:opacity-60"
    >
      {copying ? "Copying…" : "Copy link"}
    </button>
  );
}

