"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { OrgChartNode } from "./OrgChart.types";
import { OrgChartTooltip } from "./OrgChartTooltip";
import { cn } from "@/lib/utils";

type OrgChartItemProps = {
  node: OrgChartNode;
  expanded: boolean;
  onToggle: (id: string) => void;
  children?: React.ReactNode;

  href?: string;
  tooltip?: string;
  onNavigate?: (href: string) => void;
};

export function OrgChartItem({
  node,
  expanded,
  onToggle,
  children,
  href,
  tooltip,
  onNavigate,
}: OrgChartItemProps) {
  const hasChildren = !!children;
  const isClickable = !!href && !!onNavigate;

  const handleTitleClick = () => {
    if (!isClickable || !href) return;
    onNavigate(href);
  };

  const titleContent = isClickable ? (
    <button
      type="button"
      onClick={handleTitleClick}
      title={tooltip}
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate text-left text-[13px] font-medium text-foreground",
        "rounded-sm outline-none transition-colors duration-150 hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-[#5CA9FF] focus-visible:ring-offset-0"
      )}
    >
      <span className="truncate">
        {node.name}
      </span>
      <span className="text-[10px] font-normal text-muted-foreground">
        View
      </span>
    </button>
  ) : (
    <span className="truncate text-[13px] font-medium text-foreground">
      {node.name}
    </span>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Node card */}
      <div className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors duration-150 hover:border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <OrgChartTooltip node={node}>
              {titleContent}
            </OrgChartTooltip>

            {node.memberCount !== undefined && (
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                {node.memberCount}{" "}
                {node.memberCount === 1 ? "person" : "people"}
              </span>
            )}
          </div>

          {hasChildren && (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full border border-border/70 px-2 text-[11px] font-medium text-muted-foreground outline-none transition-colors transition-transform duration-150",
                "hover:border-slate-500 hover:text-foreground active:scale-[0.97]",
                "focus-visible:ring-2 focus-visible:ring-[#5CA9FF] focus-visible:ring-offset-0"
              )}
            >
              <span className="text-[11px]">
                {expanded ? "Collapse" : "Expand"}
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-150",
                  expanded ? "rotate-180" : "rotate-0"
                )}
              />
            </button>
          )}
        </div>
      </div>

      {/* Children connector + content */}
      {hasChildren && (
        <div
          className={cn(
            "relative overflow-hidden pl-4",
            // Use simple opacity/translate for expand animation
            expanded
              ? "max-h-[999px] opacity-100 transition-all duration-200 ease-out"
              : "max-h-0 opacity-0 transition-all duration-150 ease-in"
          )}
        >
          {/* Vertical connector line */}
          <div className="absolute left-1 top-0 h-full border-l border-border/70" />

          <div className="space-y-2 pl-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

