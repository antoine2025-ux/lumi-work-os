"use client";

import React from "react";
import type { TeamCapacityRow } from "@/lib/org/rollups/deriveTeamCapacity";

export function TeamCapacityTable({ rows }: { rows: TeamCapacityRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
      <table className="w-full text-sm">
        <thead className="bg-black/5 text-xs text-black/50 dark:bg-white/10 dark:text-white/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Team</th>
            <th className="px-4 py-3 text-left font-medium">Headcount</th>
            <th className="px-4 py-3 text-left font-medium">Avg capacity</th>
            <th className="px-4 py-3 text-left font-medium">Unavailable</th>
            <th className="px-4 py-3 text-left font-medium">Overallocated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.teamKey} className="border-t border-black/10 dark:border-white/10">
              <td className="px-4 py-3">{r.teamKey}</td>
              <td className="px-4 py-3">{r.headcount}</td>
              <td className="px-4 py-3">{r.avgEffectiveCapacityPct}%</td>
              <td className="px-4 py-3">{r.unavailableCount}</td>
              <td className="px-4 py-3">{r.overallocatedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

