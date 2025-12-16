"use client";

import * as React from "react";
import { OrgChartNode } from "./OrgChart.types";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

type OrgChartTooltipProps = {
  node: OrgChartNode;
  children: React.ReactNode;
};

export function OrgChartTooltip({ node, children }: OrgChartTooltipProps) {
  const hasMetadata =
    node.leadName ||
    node.leadRole ||
    typeof node.memberCount === "number" ||
    typeof node.openRolesCount === "number";

  if (!hasMetadata) {
    // If we have nothing extra to show, just render children directly.
    return <>{children}</>;
  }

  const tooltipContent = (
    <div className="space-y-1 max-w-xs">
      <div className="text-[11px] font-semibold text-slate-50">
        {node.name}
      </div>

      {node.leadName && (
        <p className="text-[11px] text-slate-300">
          Lead:{" "}
          <span className="font-medium text-slate-100">
            {node.leadName}
          </span>
          {node.leadRole && (
            <span className="text-slate-400">
              {" "}
              • {node.leadRole}
            </span>
          )}
        </p>
      )}

      {typeof node.memberCount === "number" && (
        <p className="text-[11px] text-slate-400">
          {node.memberCount}{" "}
          {node.memberCount === 1 ? "person" : "people"}
        </p>
      )}

      {typeof node.openRolesCount === "number" && node.openRolesCount > 0 && (
        <p className="text-[11px] text-slate-400">
          {node.openRolesCount} open{" "}
          {node.openRolesCount === 1 ? "role" : "roles"}
        </p>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip 
        content={tooltipContent} 
        side="top" 
        className="max-w-xs bg-[#020617] px-3 py-2 text-[11px] text-slate-200 border border-slate-700 whitespace-normal"
      >
        {children}
      </Tooltip>
    </TooltipProvider>
  );
}

