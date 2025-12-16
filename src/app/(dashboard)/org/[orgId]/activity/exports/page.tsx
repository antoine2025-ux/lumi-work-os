"use client";

import { useState } from "react";
import { ActivityExportButtons } from "@/components/org/activity-export-buttons";

type OrgExportsScreenProps = {
  orgId: string;
};

/**
 * Reusable Org exports screen.
 * Contains the existing exports list / controls from L7/L8.
 */
export function OrgExportsScreen({ orgId }: OrgExportsScreenProps) {
  const workspaceId = orgId;
  const [eventFilter, setEventFilter] = useState<"all" | "org" | "membership" | "ownership">("all");
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "all">("30d");

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-slate-100 mb-2">Export filters</h2>
          <p className="text-xs text-slate-400 mb-3">
            Configure filters for your activity export. The export will include all activity matching these criteria.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Event type</label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value as typeof eventFilter)}
              className="rounded-md border border-[#1f2937] bg-[#020617] px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="all">All events</option>
              <option value="org">Org changes</option>
              <option value="membership">Membership</option>
              <option value="ownership">Ownership</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}
              className="rounded-md border border-[#1f2937] bg-[#020617] px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-[#111827] pt-4">
        <ActivityExportButtons
          workspaceId={workspaceId}
          eventFilter={eventFilter}
          timeframe={timeframe}
        />
      </div>

      <div className="mt-4 rounded-xl border border-[#111827] bg-[#020617] p-3 text-xs text-slate-400">
        <p className="mb-2 font-medium text-slate-300">Export history</p>
        <p className="text-[11px] text-slate-500">
          Export history and scheduled exports will be displayed here in a future update.
        </p>
      </div>
    </div>
  );
}
