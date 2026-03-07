"use client";

import { LayoutGrid, Table } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "cards" | "table";

type PeopleViewToggleProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
};

/**
 * View toggle component for switching between Cards and Table views
 * Compact segmented control
 */
export function PeopleViewToggle({
  viewMode,
  onViewModeChange,
  className,
}: PeopleViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center",
        "rounded-full",
        "bg-card/40",
        "border border-border/70",
        "p-1",
        "transition-colors duration-150",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onViewModeChange("cards")}
        className={cn(
          "inline-flex items-center gap-1.5",
          "px-3 py-1.5",
          "rounded-full",
          "text-xs font-medium",
          "transition-colors",
          viewMode === "cards"
            ? "bg-primary/20 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Cards view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>Cards</span>
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("table")}
        className={cn(
          "inline-flex items-center gap-1.5",
          "px-3 py-1.5",
          "rounded-full",
          "text-xs font-medium",
          "transition-colors",
          viewMode === "table"
            ? "bg-primary/20 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Table view"
      >
        <Table className="h-3.5 w-3.5" />
        <span>Table</span>
      </button>
    </div>
  );
}

