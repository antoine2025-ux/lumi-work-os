"use client";

import React from "react";
import { Building, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgStructureDepartment } from "./normalized-types";
import type { DepartmentAccent } from "./accent-colors";

type OrgStructureDepartmentCardProps = {
  department: OrgStructureDepartment;
  isExpanded?: boolean;
  onToggle?: () => void;
  showChevron?: boolean;
  className?: string;
  accent?: DepartmentAccent;
  variant?: "list" | "tree";
};

/**
 * Shared department card component used in both List and Tree views
 * Premium styling with accent colors, refined typography, and optional accordion
 */
export function OrgStructureDepartmentCard({
  department,
  isExpanded = false,
  onToggle,
  showChevron = false,
  className,
  accent,
  variant = "list",
}: OrgStructureDepartmentCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onToggle && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onToggle();
    }
  };

  const Component = onToggle ? "button" : "div";
  const isTree = variant === "tree";

  // Default accent if not provided
  const defaultAccent: DepartmentAccent = {
    iconBg: "bg-gradient-to-br from-sky-500/40 via-blue-500/30 to-indigo-500/40",
    iconBorder: "border-blue-400/40",
    iconGlow: "shadow-[0_0_30px_rgba(56,189,248,0.45)]",
    headerGlow: "shadow-[0_0_24px_rgba(56,189,248,0.2)]",
    selectedOutline: "border-blue-400/60",
    topBorderColor: "rgba(56, 189, 248, 0.4)",
  };

  const activeAccent = accent || defaultAccent;

  return (
    <Component
      type={onToggle ? "button" : undefined}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex w-full items-center justify-between gap-3 transition-all duration-150",
        onToggle && "text-left hover:bg-card/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70",
        isTree && "px-0",
        !isTree && "px-6 py-4",
        className
      )}
      aria-expanded={showChevron && onToggle ? isExpanded : undefined}
      aria-controls={showChevron && onToggle ? `teams-${department.id}` : undefined}
      role={onToggle ? "button" : undefined}
      tabIndex={onToggle ? 0 : undefined}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Icon with accent gradient - larger in tree view */}
        <div
          className={cn(
            "relative inline-flex items-center justify-center rounded-2xl",
            activeAccent.iconBg,
            activeAccent.iconBorder,
            "border",
            activeAccent.iconGlow,
            "flex-shrink-0",
            isTree ? "h-12 w-12" : "h-10 w-10"
          )}
        >
          <Building className={cn("h-5 w-5", isTree ? "text-foreground" : "text-blue-100")} />
        </div>

        {/* Title - larger and heavier in tree view, with proper truncation */}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "font-semibold text-foreground truncate tracking-tight block",
              isTree ? "text-lg" : "text-lg"
            )}
            title={department.name}
          >
            {department.name}
          </span>
        </div>
      </div>

      {/* Metric chips and chevron - only show in list view */}
      {!isTree && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Metric chips - smaller and more understated */}
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground/80",
              accent?.chipBg || "bg-card/60"
            )}
          >
            {department.teamsCount} {department.teamsCount === 1 ? "team" : "teams"}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground/80",
              accent?.chipBg || "bg-card/60"
            )}
          >
            {department.peopleCount} {department.peopleCount === 1 ? "person" : "people"}
          </span>

          {/* Chevron button */}
          {showChevron && (
            <span
              className={cn(
                "ml-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-card/60 border border-border/50 text-muted-foreground transition-all duration-200",
                isExpanded && "rotate-180"
              )}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </Component>
  );
}
