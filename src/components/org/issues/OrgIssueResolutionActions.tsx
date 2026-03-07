"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Eye, Flag, RotateCcw } from "lucide-react";

type Resolution = "PENDING" | "ACKNOWLEDGED" | "FALSE_POSITIVE" | "RESOLVED";

type OrgIssueResolutionActionsProps = {
  currentResolution: Resolution;
  onResolve: (resolution: Resolution, note?: string) => Promise<void>;
  isLoading?: boolean;
};

export function OrgIssueResolutionActions({
  currentResolution,
  onResolve,
  isLoading = false,
}: OrgIssueResolutionActionsProps) {
  const [pendingAction, setPendingAction] = useState<Resolution | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async () => {
    if (!pendingAction) return;
    
    setError(null);
    setIsSubmitting(true);
    try {
      await onResolve(pendingAction, note || undefined);
      setPendingAction(null);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update resolution");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionTitle = (resolution: Resolution) => {
    switch (resolution) {
      case "ACKNOWLEDGED":
        return "Acknowledge Issue";
      case "FALSE_POSITIVE":
        return "Mark as Intentional";
      case "RESOLVED":
        return "Mark as Resolved";
      case "PENDING":
        return "Reopen Issue";
    }
  };

  const getActionDescription = (resolution: Resolution) => {
    switch (resolution) {
      case "ACKNOWLEDGED":
        return "Acknowledge this issue to indicate it has been reviewed. The issue will remain visible but marked as acknowledged.";
      case "FALSE_POSITIVE":
        return "Mark this as intentional if the current state is by design. The issue will be hidden from the default view.";
      case "RESOLVED":
        return "Mark this issue as resolved. It will be hidden from the default view until it reappears.";
      case "PENDING":
        return "Reopen this issue to mark it as pending again. Previous notes will be preserved.";
    }
  };

  return (
    <div className="space-y-2">
      {/* Acknowledge button - show if not already acknowledged */}
      {currentResolution !== "ACKNOWLEDGED" && currentResolution !== "RESOLVED" && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => setPendingAction("ACKNOWLEDGED")}
          disabled={isLoading}
        >
          <Eye className="h-3 w-3 mr-2" />
          Acknowledge
        </Button>
      )}

      {/* Mark intentional button - show if not already false positive */}
      {currentResolution !== "FALSE_POSITIVE" && currentResolution !== "RESOLVED" && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => setPendingAction("FALSE_POSITIVE")}
          disabled={isLoading}
        >
          <Flag className="h-3 w-3 mr-2" />
          Mark intentional
        </Button>
      )}

      {/* Resolve button - show if not already resolved */}
      {currentResolution !== "RESOLVED" && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-green-400 hover:text-green-300 hover:bg-green-950/20"
          onClick={() => setPendingAction("RESOLVED")}
          disabled={isLoading}
        >
          <Check className="h-3 w-3 mr-2" />
          Mark resolved
        </Button>
      )}

      {/* Reopen button - show if not pending */}
      {currentResolution !== "PENDING" && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-amber-400 hover:text-amber-300 hover:bg-amber-950/20"
          onClick={() => setPendingAction("PENDING")}
          disabled={isLoading}
        >
          <RotateCcw className="h-3 w-3 mr-2" />
          Reopen
        </Button>
      )}

      {/* Confirmation dialog */}
      <Dialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="bg-[#0a0f1a] border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {pendingAction && getActionTitle(pendingAction)}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {pendingAction && getActionDescription(pendingAction)}
            </DialogDescription>
          </DialogHeader>

          {/* Note input for certain actions */}
          {pendingAction && pendingAction !== "PENDING" && (
            <div className="py-2">
              <Textarea
                placeholder="Add a note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 py-2">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingAction(null)}
              className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isLoading || isSubmitting}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isSubmitting ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
