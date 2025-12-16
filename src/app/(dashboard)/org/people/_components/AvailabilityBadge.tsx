"use client";

import React from "react";

export function AvailabilityBadge({
  status,
  fraction,
}: {
  status: "available" | "partial" | "unavailable";
  fraction?: number;
}) {
  const label =
    status === "available"
      ? "Available"
      : status === "partial"
      ? `Partial (${Math.round((fraction ?? 0.5) * 100)}%)`
      : "Unavailable";

  return (
    <span className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
      {label}
    </span>
  );
}

