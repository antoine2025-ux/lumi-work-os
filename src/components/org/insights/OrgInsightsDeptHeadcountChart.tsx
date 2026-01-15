"use client";

import { memo, useMemo } from "react";
import type { OrgInsightsSnapshot } from "@/lib/org/insights";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  snapshot: OrgInsightsSnapshot;
  selectedDepartmentId?: string | null;
};

function OrgInsightsDeptHeadcountChartComponent({ snapshot, selectedDepartmentId }: Props) {
  const { displayData, hasData } = useMemo(() => {
    const raw = snapshot.byDepartment;

    const filteredRaw = selectedDepartmentId
      ? raw.filter((d) => d.departmentId === selectedDepartmentId)
      : raw;

    const data = filteredRaw
      .slice()
      .sort((a, b) => b.headcount - a.headcount)
      .map((d) => ({
        name: d.departmentName || "Unassigned",
        headcount: d.headcount,
      }));

    const displayData = data.length > 0 ? data : [{ name: "No departments", headcount: 0 }];
    const hasData = data.some((d) => d.headcount > 0);
    
    return { displayData, hasData };
  }, [snapshot.byDepartment, selectedDepartmentId]);

  return (
    <div className="h-72 rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4">
      <div className="mb-1 text-[12px] font-semibold text-slate-100">
        Headcount by department
      </div>
      <p className="mb-3 text-[11px] text-slate-500">
        Shows how people are distributed across departments in this org.
      </p>
      <div className="h-56">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                angle={-20}
                textAnchor="end"
                height={40}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#1f2937",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Bar
                dataKey="headcount"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
            Not enough department data yet. Once people are assigned to departments, you&apos;ll see headcount here.
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const OrgInsightsDeptHeadcountChart = memo(OrgInsightsDeptHeadcountChartComponent);

