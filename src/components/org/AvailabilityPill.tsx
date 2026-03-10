/**
 * Availability Pill Component
 * 
 * Displays availability status with a badge and optional stale indicator.
 * Provides consistent UI for availability across the Org module.
 */

"use client";

import { Badge } from "@/components/ui/badge";

type Status = "UNKNOWN" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";

export function AvailabilityPill({
  status,
  stale,
  subtle = false,
}: {
  status: Status | null | undefined;
  stale?: boolean;
  subtle?: boolean;
}) {
  // Don't render anything if status is UNKNOWN or null/undefined
  if (!status || status === "UNKNOWN") {
    return null;
  }

  const label =
    status === "AVAILABLE"
      ? "Available"
      : status === "PARTIALLY_AVAILABLE"
        ? "Partial"
        : "Unavailable";

  // Subtle styling for right-aligned badges
  const badgeVariant = status === "UNAVAILABLE" ? "destructive" : "secondary";

  return (
    <div className="flex items-center gap-1.5">
      {subtle ? (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-muted/50 text-muted-foreground border border-white/5">
          {label}
        </span>
      ) : (
        <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0.5 h-5">
          {label}
        </Badge>
      )}
      {stale && <span className="text-[9px] text-muted-foreground/60">Stale</span>}
    </div>
  );
}

