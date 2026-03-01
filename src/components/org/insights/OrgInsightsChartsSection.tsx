"use client";

import { useState } from "react";
import type { OrgInsightsSnapshot } from "@/lib/org/insights";
import { OrgInsightsDeptHeadcountChart } from "./OrgInsightsDeptHeadcountChart";
import { OrgInsightsJoinTrendChart } from "./OrgInsightsJoinTrendChart";

type DepartmentOption = {
  id: string;
  name: string;
};

type Props = {
  workspaceId: string;
  snapshot: OrgInsightsSnapshot;
  departmentOptions: DepartmentOption[];
};

/**
 * Charts section component that receives insights data as props.
 * No longer fetches data itself - data comes from parent component.
 */
export function OrgInsightsChartsSection({ workspaceId, snapshot, departmentOptions }: Props) {
  const [selectedDeptId, setSelectedDeptId] = useState<string | "ALL">("ALL");

  // Only show dropdown if 2+ departments exist
  const showDropdown = departmentOptions.length >= 2;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[12px] font-semibold text-slate-100">
            Org trends
          </div>
          <p className="text-[11px] text-slate-500">
            Headcount and join trends for this organization. Filter by department to focus on a specific area.
          </p>
        </div>
        {showDropdown && (
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="text-slate-500">Department focus:</span>
            <select
              className="focus-ring rounded-full border border-slate-800 bg-[#020617] px-3 py-1 text-[11px] text-slate-100 transition-colors hover:border-slate-700"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value as "ALL" | string)}
              aria-label="Filter insights by department"
            >
              <option value="ALL">All departments</option>
              {departmentOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <OrgInsightsDeptHeadcountChart
          snapshot={snapshot}
          selectedDepartmentId={selectedDeptId === "ALL" ? null : selectedDeptId}
        />
        <OrgInsightsJoinTrendChart
          snapshot={snapshot}
          selectedDepartmentId={selectedDeptId === "ALL" ? null : selectedDeptId}
        />
      </div>
    </section>
  );
}

