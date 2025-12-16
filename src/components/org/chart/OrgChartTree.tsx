"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { OrgChartNode } from "./OrgChart.types";
import { OrgChartItem } from "./OrgChartItem";
import { useOrgChartExpansion } from "./useOrgChartExpansion";

type OrgChartTreeProps = {
  data: OrgChartNode[];
};

export function OrgChartTree({ data }: OrgChartTreeProps) {
  const { isExpanded, toggle } = useOrgChartExpansion();
  const router = useRouter();

  function getNodeNavigation(node: OrgChartNode) {
    // Department → Structure page, Teams tab, filtered by department
    if (node.type === "department") {
      return {
        href: `/org/structure?tab=teams&departmentId=${encodeURIComponent(node.id)}`,
        tooltip: "View teams in this department",
      };
    }

    // Team → People page filtered by team
    if (node.type === "team") {
      return {
        href: `/org/people?teamId=${encodeURIComponent(node.id)}`,
        tooltip: "View people in this team",
      };
    }

    return {
      href: undefined,
      tooltip: undefined,
    };
  }

  function handleNavigate(href: string) {
    router.push(href);
  }

  function renderNode(node: OrgChartNode) {
    const { href, tooltip } = getNodeNavigation(node);

    return (
      <OrgChartItem
        key={node.id}
        node={node}
        expanded={isExpanded(node.id)}
        onToggle={toggle}
        href={href}
        tooltip={tooltip}
        onNavigate={href ? handleNavigate : undefined}
      >
        {node.children?.map((child) => renderNode(child))}
      </OrgChartItem>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-[13px] text-slate-400">
        No org chart data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map(renderNode)}
    </div>
  );
}

