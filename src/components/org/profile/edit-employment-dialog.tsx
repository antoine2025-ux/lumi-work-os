"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface EditEmploymentDialogProps {
  positionId: string;
  userId: string;
  workspaceId: string;
  currentData: {
    startDate?: Date | null;
    employmentType?: string | null;
    location?: string | null;
    timezone?: string | null;
  };
  /** Controlled mode: when provided, dialog is controlled externally */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, do not render the trigger button (use with controlled mode) */
  hideTrigger?: boolean;
}

export function EditEmploymentDialog({
  positionId,
  userId,
  workspaceId,
  currentData,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: EditEmploymentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<{
    canEditField: Record<string, boolean>;
  } | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      fetch(
        `/api/org/permissions/profile?targetUserId=${encodeURIComponent(userId)}&workspaceId=${encodeURIComponent(workspaceId)}`
      )
        .then((res) => res.json())
        .then((data) => setPermissions(data))
        .catch(() => setPermissions(null));
    } else {
      setPermissions(null);
    }
  }, [open, userId, workspaceId]);

  const [formData, setFormData] = useState(() => ({
    startDate: currentData.startDate
      ? new Date(currentData.startDate).toISOString().split("T")[0]
      : "",
    employmentType: currentData.employmentType || "full-time",
    location: currentData.location || "",
    timezone: currentData.timezone || "",
  }));

  useEffect(() => {
    if (open) {
      setFormData({
        startDate: currentData.startDate
          ? new Date(currentData.startDate).toISOString().split("T")[0]
          : "",
        employmentType: currentData.employmentType || "full-time",
        location: currentData.location || "",
        timezone: currentData.timezone || "",
      });
    }
  }, [open, currentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `/api/org/positions/${positionId}/employment`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: formData.startDate
              ? new Date(formData.startDate).toISOString()
              : null,
            employmentType: formData.employmentType,
            location: formData.location || null,
            timezone: formData.timezone || null,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update");
      }

      toast({
        title: "Success",
        description: "Employment details updated",
      });

      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update employment details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="border-slate-600 text-muted-foreground">
            Edit Employment
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employment Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date
              {permissions && !permissions.canEditField?.startDate && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Admin only)
                </span>
              )}
            </Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, startDate: e.target.value }))
              }
              disabled={permissions ? !permissions.canEditField?.startDate : false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employmentType">
              Employment Type
              {permissions && !permissions.canEditField?.employmentType && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Admin only)
                </span>
              )}
            </Label>
            <Select
              value={formData.employmentType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, employmentType: value }))
              }
            >
              <SelectTrigger
                disabled={
                  permissions ? !permissions.canEditField?.employmentType : false
                }
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-Time</SelectItem>
                <SelectItem value="part-time">Part-Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="San Francisco, CA"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              disabled={permissions ? !permissions.canEditField?.location : false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              placeholder="America/Los_Angeles"
              value={formData.timezone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, timezone: e.target.value }))
              }
              disabled={permissions ? !permissions.canEditField?.timezone : false}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
