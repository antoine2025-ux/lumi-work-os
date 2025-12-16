"use client";

import React from "react";

export function CapacityBadge({
  effectiveFraction,
}: {
  effectiveFraction: number; // 0..1
}) {
  const pct = Math.round(effectiveFraction * 100);
  return (
    <span className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
      Capacity: {pct}%
    </span>
  );
}

