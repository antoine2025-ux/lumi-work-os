/**
 * Edit Employment Status Dialog
 * 
 * Allows editing employment status and dates for a person.
 * Neutral labels only - no interpretation.
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrgApi } from "@/components/org/api";
import { Loader2 } from "lucide-react";

type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "CONTRACTOR";

type EditEmploymentStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  currentStatus: EmploymentStatus;
  onSaved?: () => void;
};

const STATUS_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "TERMINATED", label: "Terminated" },
  { value: "CONTRACTOR", label: "Contractor" },
];

export function EditEmploymentStatusDialog({
  open,
  onOpenChange,
  personId,
  currentStatus,
  onSaved,
}: EditEmploymentStatusDialogProps) {
  const [status, setStatus] = useState<EmploymentStatus>(currentStatus);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStatus(currentStatus);
      setStartDate("");
      setEndDate("");
      setError(null);
    }
  }, [open, currentStatus]);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      const payload: {
        employmentStatus: EmploymentStatus;
        employmentStartDate?: string | null;
        employmentEndDate?: string | null;
      } = {
        employmentStatus: status,
      };

      if (startDate) {
        payload.employmentStartDate = new Date(startDate).toISOString();
      }
      if (endDate) {
        payload.employmentEndDate = new Date(endDate).toISOString();
      }

      const result = await OrgApi.updateEmploymentStatus(personId, payload);

      if (!result.ok) {
        throw new Error("Failed to update employment status");
      }

      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0f1a] border-border sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Employment Status</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update employment status and dates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employment Status */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Employment Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as EmploymentStatus)}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Start Date (optional)</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-card border-border text-foreground"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">End Date (optional)</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-card border-border text-foreground"
            />
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="border-border text-muted-foreground"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500">
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

