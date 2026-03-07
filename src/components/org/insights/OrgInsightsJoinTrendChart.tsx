"use client";

import { memo, useMemo } from "react";
import type { OrgInsightsSnapshot } from "@/lib/org/insights";
import {
  Line,
  LineChart,
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

function OrgInsightsJoinTrendChartComponent({ snapshot, selectedDepartmentId }: Props) {
  const { displayData, hasData, scopeLabel } = useMemo(() => {
    const raw = snapshot.joinTrend;

    const data = raw.map((p) => {
      const start = new Date(p.periodStart);
      const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      return {
        label,
        newMembers: p.newMembers,
      };
    });

    const displayData =
      data.length > 0
        ? data
        : [
            {
              label: "N/A",
              newMembers: 0,
            },
          ];

    const hasData = data.some((d) => d.newMembers > 0);
    const scopeLabel = selectedDepartmentId ? "this department (approximate)" : "the whole org";
    
    return { displayData, hasData, scopeLabel };
  }, [snapshot.joinTrend, selectedDepartmentId]);

  return (
    <div className="h-72 rounded-2xl border border-border bg-background px-4 py-4">
      <div className="mb-1 text-[12px] font-semibold text-foreground">
        New members over time
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Shows how many people joined {scopeLabel} in recent months.
      </p>
      <div className="h-56">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                height={30}
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
              <Line
                type="monotone"
                dataKey="newMembers"
                stroke="#5CA9FF"
                strokeWidth={2}
                dot={{ r: 3, fill: "#5CA9FF" }}
                activeDot={{ r: 5, fill: "#5CA9FF" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            No recent join activity yet. As people join this org, you&apos;ll see the trend here.
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const OrgInsightsJoinTrendChart = memo(OrgInsightsJoinTrendChartComponent);

