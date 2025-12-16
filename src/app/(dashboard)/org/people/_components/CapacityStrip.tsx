"use client";

import React from "react";

export function CapacityStrip({
  avgCapacityPct,
  overallocatedCount,
}: {
  avgCapacityPct: number;
  overallocatedCount: number;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-black/50 dark:text-white/50">Org capacity (average)</div>
          <div className="text-lg font-semibold">{avgCapacityPct}%</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-black/50 dark:text-white/50">Overallocated</div>
          <div className="text-sm">{overallocatedCount}</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-black/50 dark:text-white/50">
        Capacity is derived from availability and recorded allocations.
      </div>
    </div>
  );
}

