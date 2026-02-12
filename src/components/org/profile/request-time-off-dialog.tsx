"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { differenceInDays } from "date-fns";

interface RequestTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
}

const TYPE_TO_LEAVE_TYPE: Record<string, string> = {
  vacation: "VACATION",
  sick: "SICK",
  personal: "PERSONAL",
};

export function RequestTimeOffDialog({
  open,
  onOpenChange,
  personId,
}: RequestTimeOffDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    type: "vacation",
    reason: "",
  });

  const start = formData.startDate ? new Date(formData.startDate) : null;
  const end = formData.endDate ? new Date(formData.endDate) : null;
  const daysCount =
    start && end && end >= start
      ? differenceInDays(end, start) + 1
      : 0;
  const hasInvalidDates = start && end && end < start;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (daysCount < 1) {
      toast({
        title: "Invalid Dates",
        description: "End date must be on or after start date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/org/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          leaveType: TYPE_TO_LEAVE_TYPE[formData.type] ?? "VACATION",
          notes: formData.reason || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit request");
      }

      toast({
        title: "Request Submitted",
        description: `Your time off request for ${daysCount} day(s) has been submitted.`,
      });

      setFormData({ startDate: "", endDate: "", type: "vacation", reason: "" });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to submit time off request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="request-time-off-description">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription id="request-time-off-description">
            Submit a time off request for manager approval. Select dates and type.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
          </div>

          {hasInvalidDates && (
            <p className="text-sm text-destructive font-medium">
              End date must be on or after start date.
            </p>
          )}
          {daysCount > 0 && !hasInvalidDates && (
            <div className="text-sm text-muted-foreground">
              Total: {daysCount} {daysCount === 1 ? "day" : "days"}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Note (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Optional note about your time off"
              rows={3}
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || hasInvalidDates}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
