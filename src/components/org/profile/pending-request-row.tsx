"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  VACATION: "Vacation",
  SICK: "Sick Leave",
  PERSONAL: "Personal",
  PARENTAL: "Parental Leave",
  UNPAID: "Unpaid",
};

interface PendingRequestRowProps {
  id: string;
  startDate: Date;
  endDate: Date;
  leaveType: string;
  daysCount: number;
  status: string;
}

export function PendingRequestRow({
  id,
  startDate,
  endDate,
  leaveType,
  daysCount,
}: PendingRequestRowProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/leave-requests/${id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to cancel");
      }
      toast({ title: "Request cancelled", description: "Your time off request has been cancelled." });
      router.refresh();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to cancel request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-background flex items-center justify-between gap-2">
      <div className="flex-1">
        <div className="font-medium text-sm text-foreground mb-1">
          {REASON_LABELS[leaveType] ?? leaveType}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(startDate), "MMM d")} - {format(new Date(endDate), "MMM d, yyyy")}
          <span className="ml-2">
            ({daysCount} {daysCount === 1 ? "day" : "days"})
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-amber-600 text-amber-400 text-xs">
          Pending
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={loading}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-2"
        >
          <X className="h-4 w-4 mr-1" />
          {loading ? "..." : "Cancel"}
        </Button>
      </div>
    </div>
  );
}
